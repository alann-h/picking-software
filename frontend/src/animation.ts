import { css, keyframes } from '@emotion/react';

export const shake = keyframes`
  0% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  50% { transform: translateX(5px); }
  75% { transform: translateX(-5px); }
  100% { transform: translateX(0); }
`;

export const shakeStyle = css`
  animation: ${shake} 0.5s;
`;
