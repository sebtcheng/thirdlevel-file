// Screen change: a quick 200ms rise + fade on mount (UI rules: subtle motion only, no blur or scale).
import React from 'react';

const PageTransition = ({ children }) => (
    <div className="w-full h-full ui-pop-in">
        {children}
    </div>
);

export default PageTransition;
