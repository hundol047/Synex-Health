import React from 'react';
import {BUILD_LABEL,UI_REVISION} from '../lib/buildInfo.js';
export function reportFailure(code){if(['render_error','unhandled_rejection'].includes(code))window.dispatchEvent(new CustomEvent('synex-diagnostic',{detail:{code}}));}
export default class ErrorBoundary extends React.Component{
 state={failed:false,kind:'render_error',attempt:0};
 static getDerivedStateFromError(error){return {failed:true,kind:error?.name==='TypeError'?'render_type_error':'render_error'};}
 componentDidCatch(){reportFailure('render_error');}
 componentDidMount(){this.rejection=()=>reportFailure('unhandled_rejection');window.addEventListener('unhandledrejection',this.rejection);}
 componentWillUnmount(){window.removeEventListener('unhandledrejection',this.rejection);}
 render(){return this.state.failed?<main className="health-main"><section className="card" role="alert"><h1>화면을 다시 불러와 주세요.</h1><p>화면 표시 중 오류가 발생했습니다. 다시 시도해도 반복되면 아래 오류 코드와 화면을 알려 주세요.</p><p data-testid="build-label">{UI_REVISION} · {BUILD_LABEL} · {this.state.kind}</p><button className="btn btn-primary" onClick={()=>this.setState(s=>({failed:false,attempt:s.attempt+1}))}>화면 다시 시도</button></section></main>:<React.Fragment key={this.state.attempt}>{this.props.children}</React.Fragment>;}
}
