use near_sdk::json_types::U128;
use near_sdk::serde_json::json;
use near_sdk::{env, near, AccountId, Gas, NearToken, Promise, PromiseOrValue, PromiseResult};

#[cfg(target_arch = "wasm32")]
const VAULT: &[u8] = include_bytes!("../../../artifacts/vault-provisioning.wasm");
#[cfg(not(target_arch = "wasm32"))]
const VAULT: &[u8] = b"host-tests-only-never-deploy";
const FUNDING: u128 = 5 * 10u128.pow(24);

// Stateless and immutable: no administrator, configurable owner, upgrade method,
// claimable initializer, or user-supplied code. Deploy without access keys.
#[near(contract_state)]
#[derive(Default)]
pub struct Factory {}

#[near]
impl Factory {
    pub fn get_config(&self) -> near_sdk::serde_json::Value {
        json!({"vault_code_hash": env::sha256_array(VAULT), "vault_bytes": VAULT.len(),
            "funding": U128(FUNDING), "budget": U128(0), "payment_cap": U128(10u128.pow(22)),
            "max_factory_id_length": 21, "version": 1})
    }

    #[payable]
    pub fn create_vault(&mut self, request_id: String) -> Promise {
        let owner = env::signer_account_id();
        assert_eq!(env::predecessor_account_id(), owner, "DIRECT_OWNER_ONLY");
        assert_ne!(owner, env::current_account_id(), "SEPARATE_OWNER_REQUIRED");
        assert!(
            env::current_account_id().as_str().len() <= 21,
            "FACTORY_ID_TOO_LONG"
        );
        assert!(
            request_id.len() == 32
                && request_id
                    .bytes()
                    .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b)),
            "INVALID_REQUEST"
        );
        assert_eq!(
            env::attached_deposit().as_yoctonear(),
            FUNDING,
            "EXACT_FUNDING_REQUIRED"
        );
        assert!(
            env::prepaid_gas().as_gas() >= Gas::from_tgas(200).as_gas(),
            "PROVISIONING_GAS_REQUIRED"
        );
        let hash = env::sha256(format!("{}:{}", owner, request_id).as_bytes());
        let label = hash[..20]
            .iter()
            .map(|b| format!("{b:02x}"))
            .collect::<String>();
        let vault: AccountId = format!("v-{}.{}", label, env::current_account_id())
            .parse()
            .expect("VALID_CHILD");
        // One atomic action receipt, including initialization; never deploy to an
        // existing account, install keys, or leave an uninitialized claim window.
        let payment_cap = if cfg!(feature = "fault-init-args") {
            "0"
        } else {
            "10000000000000000000000"
        };
        Promise::new(vault)
            .create_account()
            .transfer(NearToken::from_yoctonear(FUNDING))
            .deploy_contract(VAULT.to_vec())
            .function_call(
                "new_from_factory".into(),
                json!({"owner": owner, "request_id": request_id,
                "budget": "0", "payment_cap": payment_cap})
                .to_string()
                .into_bytes(),
                NearToken::from_yoctonear(0),
                Gas::from_tgas(60),
            )
            .then(Promise::new(env::current_account_id()).function_call(
                "on_created".into(),
                json!({"owner": owner}).to_string().into_bytes(),
                NearToken::from_yoctonear(0),
                Gas::from_tgas(15),
            ))
    }

    #[private]
    pub fn on_created(&mut self, owner: AccountId) -> PromiseOrValue<bool> {
        #[cfg(feature = "fault-created-callback")]
        env::panic_str("SANDBOX_CALLBACK_FAILURE");
        assert_eq!(
            env::promise_results_count(),
            1,
            "ONE_CREATION_RESULT_REQUIRED"
        );
        match env::promise_result(0) {
            PromiseResult::Successful(_) => PromiseOrValue::Value(true),
            PromiseResult::Failed => {
                // Failed child receipt refunds its transfer to this predecessor.
                // Return the refund promise so FINAL includes its result. If the
                // callback/refund itself fails, off-chain progress stays blocked.
                PromiseOrValue::Promise(
                    Promise::new(owner).transfer(NearToken::from_yoctonear(FUNDING)),
                )
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::{
        test_utils::{get_created_receipts, VMContextBuilder},
        testing_env,
    };
    fn context(owner: &str, funding: u128) {
        testing_env!(VMContextBuilder::new()
            .current_account_id("v.operator.testnet".parse().unwrap())
            .predecessor_account_id(owner.parse().unwrap())
            .signer_account_id(owner.parse().unwrap())
            .attached_deposit(NearToken::from_yoctonear(funding))
            .account_balance(NearToken::from_near(100))
            .prepaid_gas(Gas::from_tgas(250))
            .build());
    }
    #[test]
    fn distinct_wallets_get_distinct_children_and_same_request_is_deterministic() {
        let mut f = Factory::default();
        context("alice.testnet", FUNDING);
        drop(f.create_vault("a".repeat(32)));
        let a = get_created_receipts()[0].receiver_id.clone();
        context("bob.testnet", FUNDING);
        drop(f.create_vault("a".repeat(32)));
        let b = get_created_receipts()[0].receiver_id.clone();
        assert_ne!(a, b);
        context("alice.testnet", FUNDING);
        drop(f.create_vault("a".repeat(32)));
        assert_eq!(a, get_created_receipts()[0].receiver_id);
    }
    #[test]
    #[should_panic(expected = "EXACT_FUNDING_REQUIRED")]
    fn rejects_wrong_funding_before_creating_receipts() {
        context("alice.testnet", FUNDING - 1);
        Factory::default().create_vault("a".repeat(32));
    }
    #[test]
    #[should_panic(expected = "DIRECT_OWNER_ONLY")]
    fn rejects_proxy_caller() {
        testing_env!(VMContextBuilder::new()
            .current_account_id("v.operator.testnet".parse().unwrap())
            .predecessor_account_id("proxy.testnet".parse().unwrap())
            .signer_account_id("alice.testnet".parse().unwrap())
            .build());
        Factory::default().create_vault("a".repeat(32));
    }
}
