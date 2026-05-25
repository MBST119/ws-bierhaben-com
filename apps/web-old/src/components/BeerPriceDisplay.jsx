
import React from 'react';
import { getBeerUnitDisplay } from '@/constants/beerUnits.js';

const BeerPriceDisplay = ({ price, unit, size = 'md', showLabel = true }) => {
  const unitData = getBeerUnitDisplay(unit);
  
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  const emojiSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-3xl',
    xl: 'text-4xl'
  };

  return (
    <div className="flex items-center gap-2">
      <span className={emojiSizes[size]}>{unitData.emoji}</span>
      <div className="flex flex-col">
        <span className={`font-bold text-primary ${sizeClasses[size]}`}>
          {price} {price === 1 ? unitData.name : unitData.plural}
        </span>
        {showLabel && size !== 'sm' && (
          <span className="text-xs text-muted-foreground">Bier-Preis</span>
        )}
      </div>
    </div>
  );
};

export default BeerPriceDisplay;
