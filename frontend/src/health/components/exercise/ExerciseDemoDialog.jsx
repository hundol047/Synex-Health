import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import './exercise-experience.css';

export default function ExerciseDemoDialog({ name, onClose, children }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current, trigger = document.activeElement;
    const overflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(<dialog ref={dialog} className="exercise-demo-dialog" aria-label={`${name} 동작 시범`} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => {
    if (event.target !== event.currentTarget) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
  }}>
    <header className="exercise-demo-dialog-heading"><strong>{name}</strong><button type="button" className="btn btn-secondary" onClick={onClose} aria-label="동작 시범 닫기" autoFocus><X size={18}/>닫기</button></header>
    <div className="exercise-demo-dialog-content">{children}</div>
  </dialog>, document.body);
}
