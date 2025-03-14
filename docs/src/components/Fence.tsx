'use client';

import { Highlight } from 'prism-react-renderer';
import { Fragment } from 'react';

export function Fence({ children, language }: { children: string; language: string }) {
  return (
    <Highlight code={children.trimEnd()} language={language} theme={{ plain: {}, styles: [] }}>
      {({ className, style, tokens, getTokenProps }) => (
        <pre className={className} style={style}>
          <code>
            {tokens.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {line
                  .filter((token) => !token.empty)
                  .map((token, tokenIndex) => (
                    <span key={tokenIndex} {...getTokenProps({ token })} />
                  ))}
                {'\n'}
              </Fragment>
            ))}
          </code>
        </pre>
      )}
    </Highlight>
  );
}
