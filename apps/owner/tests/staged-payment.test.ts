import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Queue,structuredInvoice} from '../src/server/queue.ts';

test('staged bill is idempotent and cannot dispatch until its exact plan releases it',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nnetics-staged-'));
  const file=path.join(directory,'queue.db');
  let queue=new Queue(file);
  const invoice=structuredInvoice({id:'acceptance-bill',order_id:'acceptance-order',vendor_id:'babygoat',recipient:'babygoat.testnet',amount:'1000000000000000000000',asset:'NEAR',text:'Delivered the agreed article.'});
  try {
    const binding=queue.stagePayment('org','bill','agreement',invoice);
    assert.deepEqual(queue.stagePayment('org','bill','agreement',invoice),binding);
    assert.equal(queue.all().length,1);
    assert.equal(queue.claim(invoice.id),false);
    assert.throws(()=>queue.update(invoice.id,'queued'),/separate release authorization/);
    assert.throws(()=>queue.add({...invoice,id:'duplicate'},[]),/staged payment/);
    assert.throws(()=>queue.stagePayment('org','bill','agreement',structuredInvoice({...invoice,amount:'1'})),/differs/);
    queue.close();queue=new Queue(file);
    assert.deepEqual(queue.stagedPayment('bill','org'),binding);
    assert.throws(()=>queue.assertStagedRelease(invoice.id,binding,'plan'),/not released/);
    assert.equal(queue.releaseStagedPayment(invoice,'plan').state,'queued');
    queue.assertStagedRelease(invoice.id,binding,'plan');
    assert.throws(()=>queue.assertStagedRelease(invoice.id,{...binding,bill:'different'},'plan'),/not released/);
    assert.equal(queue.claim(invoice.id),true);
    assert.equal(queue.releaseStagedPayment(invoice,'plan').state,'preparing');
    queue.db.prepare('INSERT INTO metadata VALUES (?,?)').run('cleanup:plan','cleanup-attempt');
    assert.throws(()=>queue.releaseStagedPayment(invoice,'plan'),/permanently closed/);
    assert.throws(()=>queue.releaseStagedPayment(invoice,'different-plan'),/differs/);
  } finally {
    queue.close();
    fs.rmSync(directory,{recursive:true});
  }
});
