import { evaluate } from './policy.ts';
import { scenario } from '../fixtures/scenario.ts';
const s = scenario();
console.log('Simulation only: no wallet, network calls, or transfers.');
console.log('Approved invoice:', evaluate(s.invoice, s.order, s.ctx));
console.log('Changed recipient:', evaluate({ ...s.invoice, recipient: 'other-demo.testnet' }, s.order, s.ctx));
console.log('Duplicate work order:', evaluate(s.invoice, s.order, { ...s.ctx, paidWorkOrderIds: [s.order.id] }));
