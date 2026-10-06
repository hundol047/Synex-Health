import React from 'react';
import {createPortal} from 'react-dom';
// Portals keep fixed controls outside transformed cards and scroll containers.
export default function BottomActions({children,className='',label}){
 return createPortal(<nav className={className} aria-label={label}>{children}</nav>,document.body);
}
