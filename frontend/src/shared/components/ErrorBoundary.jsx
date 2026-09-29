import React from 'react';
// Optional telemetry adapters receive only an allowlisted event code, never exceptions or user data.
export function reportFailure(code){if(['render_error','unhandled_rejection'].includes(code))window.dispatchEvent(new CustomEvent('synex-diagnostic',{detail:{code}}));}
export default class ErrorBoundary extends React.Component{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 componentDidCatch(){reportFailure('render_error');}
 componentDidMount(){this.rejection=()=>{reportFailure('unhandled_rejection');this.setState({failed:true});};window.addEventListener('unhandledrejection',this.rejection);}
 componentWillUnmount(){window.removeEventListener('unhandledrejection',this.rejection);}
 render(){return this.state.failed?<main className="health-main"><section className="card" role="alert"><h1>화면을 다시 불러와 주세요.</h1><p>일시적인 오류가 발생했습니다. 저장되지 않은 입력은 다시 확인해 주세요.</p><button className="btn btn-primary" onClick={()=>location.reload()}>다시 시작</button></section></main>:this.props.children;}
}
