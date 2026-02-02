import React from 'react';

import { SvgAdapter } from './adapters/SvgAdapter';

export function Avatar({ type = 'svg', status, ...props }) {
  if (type === 'svg') {
    return <SvgAdapter status={status} {...props} />;
  }
  if (type === 'rive') {
    return <RiveAdapter status={status} {...props} />;
  }
  return <div className="text-red-500">Unknown Avatar Type: {type}</div>;
}