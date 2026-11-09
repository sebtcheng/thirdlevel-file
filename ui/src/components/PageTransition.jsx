// Screen change: a quick 160ms opacity fade on mount (UI rules: subtle motion only, no blur or scale).
import React from 'react';

const PageTransition = ({ children }) => (
    <div className="w-full h-full ui-fade-in">
        {children}
    </div>
);

export default PageTransition;
