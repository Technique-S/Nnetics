// Adapted from Stageshow examples/static-card (MIT). Isolated illustration only.
// Keeps cropped window, quiet list and overlapping detail; changes content to a NEAR bill.
import {Stage} from '../../artifacts/design-runtime/kit/stage';
import {Window,Text,Bar} from '../../artifacts/design-runtime/kit/window';
import {Row} from '../../artifacts/design-runtime/kit/parts/Row';
import './stage.css';
export default function InvoiceStudy(){return <Stage width={440} height={320} compact={{below:440,width:358,height:320}} className="nnetics-study" theme="light" fidelity="realistic" tokens={{'--ss-accent':'#1b6650','--ss-accent-soft':'#e9f1e3','--ss-text':'#17322b','--ss-text-strong':'#17322b','--ss-font':'Arial, sans-serif'}}>
 {()=> <><Window url="Nnetics · design study" className="study-window"><aside className="study-nav"><Text>Overview</Text><Text>Invoices</Text><Text>Work orders</Text><Text>History</Text><Bar w={46}/><Bar w={56}/><Bar w={38}/><Bar w={48}/></aside><div className="study-list"><div className="study-title">Invoice review</div><Row pad={12} title={<Text>Research article</Text>} subtitle={<Text>CTR-0042-INV-0001</Text>} selected/><Row pad={12} title={<Text>Launch graphic</Text>} subtitle={<Text>Needs clarification</Text>}/><Row pad={12} title={<Text>Video edit</Text>} subtitle={<Text>Submitted</Text>}/><Row pad={12} title={<Bar w={90}/>} subtitle={<Bar w={65}/>}/></div></Window><div className="study-detail"><div className="study-status">Under review</div><Text className="study-ref">CTR-0042-INV-0001</Text><div className="study-money">0.001 <span>NEAR</span></div><Text>One approved work order</Text><div className="study-foot">Recipient fixed by order</div></div></>}
 </Stage>;}
