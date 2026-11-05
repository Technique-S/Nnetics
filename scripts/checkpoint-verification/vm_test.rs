//! Offline exact-WASM execution using public captured state, not fabricated proofs.
//! No signer, HTTP client, sandbox account or broadcast path exists here.
use near_parameters::{RuntimeConfigStore, RuntimeConfigView};
use near_primitives_core::{account::AccountContract, types::{Balance, Gas}};
use near_vm_runner::{ContractCode, logic::{VMContext, types::ReturnData, mocks::mock_external::MockedExternal}};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{path::PathBuf, sync::Arc, rc::Rc};

fn load(path: &std::path::Path) -> Value { serde_json::from_slice(&std::fs::read(path).unwrap()).unwrap() }
fn u64v(v: &Value) -> u64 { v.as_u64().unwrap_or_else(|| v.as_str().unwrap().parse().unwrap()) }
fn amount(v: &Value) -> Balance { Balance::from_yoctonear(v.as_str().unwrap().parse().unwrap()) }
fn hex_bytes(s: &str) -> Vec<u8> { assert_eq!(s.len()%2,0); (0..s.len()).step_by(2).map(|i|u8::from_str_radix(&s[i..i+2],16).unwrap()).collect() }
fn digest(bytes: &[u8]) -> String { format!("{:x}",Sha256::digest(bytes)) }
fn context(plan:&Value,capture:&Value,input:Vec<u8>,storage:u64,balance:Balance,gas:u64) -> VMContext {
    VMContext {
        current_account_id:plan["contract"].as_str().unwrap().parse().unwrap(),
        signer_account_id:plan["owner"].as_str().unwrap().parse().unwrap(),
        signer_account_pk:serde_json::from_value(capture["ownerPublicKeyBytes"].clone()).unwrap(),
        predecessor_account_id:plan["owner"].as_str().unwrap().parse().unwrap(),
        refund_to_account_id:plan["owner"].as_str().unwrap().parse().unwrap(),
        input:Rc::from(input),promise_results:Vec::new().into(),
        block_height:u64v(&capture["block"]["height"]),block_timestamp:u64v(&capture["block"]["timestamp_nanosec"]),epoch_height:0,
        account_balance:balance,account_locked_balance:amount(&capture["account"]["locked"]),storage_usage:storage,
        account_contract:AccountContract::Local(capture["account"]["code_hash"].as_str().unwrap().parse().unwrap()),
        attached_deposit:Balance::ZERO,prepaid_gas:Gas::from_gas(gas),random_seed:vec![0;32],view_config:None,output_data_receivers:vec![],
    }
}
fn invoke(ext:&mut MockedExternal,ctx:&VMContext,method:&str,config:Arc<near_parameters::vm::Config>,fees:Arc<near_parameters::RuntimeFeesConfig>) -> near_vm_runner::logic::VMOutcome {
    let prepared=near_vm_runner::prepare(ext,config.clone(),None,ctx.make_gas_counter(&config),method);
    near_vm_runner::run(prepared,ext,ctx,fees).expect("VM engine failure: do not substitute another VM or alter versions")
}
fn read(ext:&mut MockedExternal,ctx:&VMContext,method:&str,config:Arc<near_parameters::vm::Config>,fees:Arc<near_parameters::RuntimeFeesConfig>) -> Value {
    let before=ext.fake_trie.clone();let result=invoke(ext,ctx,method,config,fees);
    assert!(result.aborted.is_none(),"View aborted: {:?}",result.aborted);assert_eq!(before,ext.fake_trie,"View changed state");
    match result.return_data { ReturnData::Value(bytes)=>serde_json::from_slice(&bytes).unwrap(),_=>panic!("View returned no JSON") }
}
#[test]
fn seven_exact_checkpoint_inputs() {
    let root=PathBuf::from(std::env::var_os("NNETICS_V4_BUNDLE_DIR").expect("Use run-linux.sh"));
    let report_path=PathBuf::from(std::env::var_os("NNETICS_V4_VM_REPORT").expect("Use run-linux.sh for a new result path"));
    let manifest=load(&root.join("manifest.json"));
    let plan_bytes=std::fs::read(root.join("plan-v4.json")).unwrap();
    let plan:Value=serde_json::from_slice(&plan_bytes).unwrap();
    let capture=load(&root.join("capture.json"));
    assert_eq!(digest(&plan_bytes),"d6ee7587ed059a22e76ce05cf254d4de33d3066730d5abda7672424add9599f5");
    let wasm=std::fs::read(root.join("vault.wasm")).unwrap();assert_eq!(digest(&wasm),manifest["wasmSha256"].as_str().unwrap());
    let code=ContractCode::new(wasm,None);assert_eq!(code.hash().to_string(),plan["expectedCodeHash"].as_str().unwrap());
    let store=RuntimeConfigStore::for_chain_id("testnet");let runtime=store.get_config(88);
    let view=serde_json::to_value(RuntimeConfigView::from((**runtime).clone())).unwrap();
    // Never substitute a convenient default/free test gas model.
    for field in ["wasm_config","transaction_costs","storage_amount_per_byte"] {assert_eq!(view[field],capture["protocol"]["runtime_config"][field],"Captured protocol config differs: {field}");}
    let config=runtime.wasm_config.clone();let fees=runtime.fees.clone();
    let mut ext=MockedExternal::with_code(code);let state=load(&root.join("state-hex.json"));
    for entry in state.as_array().unwrap(){ext.fake_trie.insert(hex_bytes(entry["key"].as_str().unwrap()),hex_bytes(entry["value"].as_str().unwrap()));}
    let original=ext.fake_trie.clone();let mut storage=u64v(&capture["account"]["storage_usage"]);let mut balance=amount(&capture["account"]["amount"]);
    let ctx=context(&plan,&capture,b"{}".to_vec(),storage,balance,250_000_000_000_000);
    assert_eq!(read(&mut ext,&ctx,"get_repair_checkpoint",config.clone(),fees.clone()),capture["checkpoint"]);
    let original_vault=read(&mut ext,&ctx,"get_vault",config.clone(),fees.clone());assert_eq!(original_vault,capture["vault"]);
    let operations:Vec<_>=plan["operations"].as_array().unwrap().iter().filter(|o|o["actions"][0]["method"]=="advance_repair_head").collect();assert_eq!(operations.len(),7);
    let mut rows=vec![];
    for (index,op) in operations.iter().enumerate(){
        let input=std::fs::read(root.join(format!("input-{}.json",index+1))).unwrap();assert_eq!(digest(&input),op["argsSha256"].as_str().unwrap());assert_eq!(input.len() as u64,u64v(&op["argsBytes"]));
        assert_eq!(serde_json::from_slice::<Value>(&input).unwrap(),op["actions"][0]["args"]);assert_eq!(op["actions"][0]["depositYoctoNEAR"],"0");assert_eq!(u64v(&op["actions"][0]["gas"]),250_000_000_000_000);
        let before=ext.clone();let ctx=context(&plan,&capture,input,storage,balance,250_000_000_000_000);
        let outcome=invoke(&mut ext,&ctx,"advance_repair_head",config.clone(),fees.clone());
        rows.push(json!({"step":op["id"],"inputSha256":op["argsSha256"],"burntGas":outcome.burnt_gas.as_gas().to_string(),"usedGas":outcome.used_gas.as_gas().to_string(),"storageBefore":storage,"storageAfter":outcome.storage_usage,"aborted":outcome.aborted.as_ref().map(|e|e.to_string())}));
        let report=json!({"mode":"actual deployed WASM; captured real state/inputs; memory trie adapter","protocol":88,"vmKind":format!("{:?}",config.vm_kind),"complete":false,"rows":rows});
        std::fs::write(&report_path,serde_json::to_vec_pretty(&report).unwrap()).unwrap();
        if outcome.aborted.is_some(){ext=before;assert!(ext.action_log.is_empty());panic!("Exact step aborted: {:?}; caller restored only this call's memory overlay. This is not evidence of full nearcore rollback. Do not change gas/arguments to obtain a pass",outcome.aborted);}
        assert!(outcome.used_gas.as_gas()<=250_000_000_000_000);assert!(outcome.logs.is_empty());assert!(ext.action_log.is_empty(),"Unexpected promise/action; no financial side effect is permitted");
        balance=outcome.balance;storage=outcome.storage_usage;
        for (key,value) in &original {if key.as_slice()!=b"nnetics:repair:v1:light-client"{assert_eq!(ext.fake_trie.get(key),Some(value),"Non-checkpoint state changed");}}
        assert_eq!(ext.fake_trie.len(),original.len(),"Unexpected storage key introduced");
        let view_ctx=context(&plan,&capture,b"{}".to_vec(),storage,balance,250_000_000_000_000);
        assert_eq!(read(&mut ext,&view_ctx,"get_repair_checkpoint",config.clone(),fees.clone()),load(&root.join(format!("expected-{}.json",index+1))));
        // The getter derives storage stake from storage usage, including checkpoint bytes.
        let checkpoint_key: &[u8] = b"nnetics:repair:v1:light-client";
        let initial_storage = u64v(&capture["account"]["storage_usage"]);
        let checkpoint_delta = ext.fake_trie[checkpoint_key].len() as i128
            - original[checkpoint_key].len() as i128;
        assert_eq!(i128::from(storage), i128::from(initial_storage) + checkpoint_delta);
        let storage_stake = u128::from(storage)
            .checked_mul(runtime.storage_amount_per_byte().as_yoctonear())
            .unwrap();
        let mut expected_vault = original_vault.clone();
        expected_vault["storage_stake"] = json!(storage_stake.to_string());
        assert_eq!(read(&mut ext,&view_ctx,"get_vault",config.clone(),fees.clone()),expected_vault);
    }
    let report=json!({"mode":"actual deployed WASM; real captured state/inputs; memory trie adapter (not a full nearcore receipt/trie simulation)","protocol":88,"vmKind":format!("{:?}",config.vm_kind),"complete":true,"sevenInputsPassed":true,"networkTransactions":0,"rows":rows});
    std::fs::write(&report_path,serde_json::to_vec_pretty(&report).unwrap()).unwrap();println!("{}",report);
}
