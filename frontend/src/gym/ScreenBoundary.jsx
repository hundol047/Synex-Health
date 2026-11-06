import React from "react";
import { Link } from "react-router-dom";
export default class ScreenBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section className="gym-card gym-recovery" role="alert">
        <span className="gym-eyebrow">화면 복구</span>
        <h1>화면을 다시 불러와 주세요.</h1>
        <p>
          저장된 기록은 삭제하지 않습니다. 홈으로 이동하거나 이 화면을 다시 열
          수 있습니다.
        </p>
        <button
          className="gym-button"
          onClick={() => this.setState({ failed: false })}
        >
          다시 시도
        </button>
        <Link className="gym-button secondary" to={this.props.home}>
          홈으로 이동
        </Link>
      </section>
    );
  }
}
