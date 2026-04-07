import React from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { DateRange } from '../../utils/dateRange.utils';
import { Input } from './Input';
import { PeriodFilter } from './PeriodFilter';
import { Button } from './Button';
import { MobileSelectField, type MobileSelectOption } from '../mobile/MobileContentFirst';

type FilterContent = React.ReactNode | React.ReactNode[];

const normalizeNodes = (content?: FilterContent) => React.Children.toArray(content).filter(Boolean);

interface FilterBarProps {
  search?: React.ReactNode;
  primary?: FilterContent;
  period?: React.ReactNode;
  actions?: FilterContent;
  secondary?: FilterContent;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  search,
  primary,
  period,
  actions,
  secondary,
  className,
}) => {
  const primaryNodes = normalizeNodes(primary);
  const actionNodes = normalizeNodes(actions);
  const secondaryNodes = normalizeNodes(secondary);
  const hasMainRow = Boolean(search || primaryNodes.length || period || actionNodes.length);

  return (
    <div className={cn('app-filter-bar', className)}>
      {hasMainRow ? (
        <div className="app-filter-bar__main">
          {search ? <div className="app-filter-slot app-filter-slot-search">{search}</div> : null}
          {(primaryNodes.length || period || actionNodes.length) ? (
            <div className="app-filter-bar__cluster">
              {primaryNodes.map((node, index) => (
                <div key={`primary-${index}`} className="app-filter-slot app-filter-slot-control">
                  {node}
                </div>
              ))}
              {period ? <div className="app-filter-slot app-filter-slot-period">{period}</div> : null}
              {actionNodes.length ? (
                <div className="app-filter-slot app-filter-slot-actions">
                  <FilterActions>{actionNodes}</FilterActions>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {secondaryNodes.length ? (
        <div className="app-filter-bar__secondary">
          {secondaryNodes.map((node, index) => (
            <div key={`secondary-${index}`} className="app-filter-slot app-filter-slot-secondary">
              {node}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

interface FilterSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  inputClassName?: string;
}

export const FilterSearch: React.FC<FilterSearchProps> = ({
  value,
  onChange,
  placeholder,
  className,
  inputClassName,
}) => (
  <div className={cn('app-filter-control app-filter-control-search', className)}>
    <Input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      icon={Search}
      className={cn('w-full', inputClassName)}
    />
  </div>
);

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: MobileSelectOption[];
  placeholder?: string;
  sheetTitle?: string;
  label?: string;
  className?: string;
  selectClassName?: string;
  disabled?: boolean;
}

export const FilterSelect: React.FC<FilterSelectProps> = ({
  className,
  selectClassName,
  ...props
}) => (
  <MobileSelectField
    {...props}
    className={cn('app-filter-control', className)}
    selectClassName={cn('w-full', selectClassName)}
  />
);

interface FilterPeriodProps {
  moduleId: string;
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
  mode?: 'full' | 'customOnly';
}

export const FilterPeriod: React.FC<FilterPeriodProps> = ({
  moduleId,
  value,
  onChange,
  className,
  mode = 'full',
}) => (
  <PeriodFilter
    moduleId={moduleId}
    value={value}
    onChange={onChange}
    mode={mode}
    className={cn('app-filter-control app-filter-control-period', className)}
  />
);

interface FilterDateRangeProps {
  startValue: string;
  endValue: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  startLabel?: string;
  endLabel?: string;
  className?: string;
}

export const FilterDateRange: React.FC<FilterDateRangeProps> = ({
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  startLabel = 'Desde',
  endLabel = 'Hasta',
  className,
}) => (
  <div className={cn('app-filter-date-range', className)}>
    <div className="app-filter-control">
      <Input
        label={startLabel}
        type="date"
        value={startValue}
        onChange={(event) => onStartChange(event.target.value)}
      />
    </div>
    <div className="app-filter-control">
      <Input
        label={endLabel}
        type="date"
        value={endValue}
        onChange={(event) => onEndChange(event.target.value)}
      />
    </div>
  </div>
);

export const FilterActions: React.FC<React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }> = ({
  children,
  className,
  ...props
}) => (
  <div className={cn('app-filter-actions', className)} {...props}>
    {children}
  </div>
);

export const FilterPanel: React.FC<React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }> = ({
  children,
  className,
  ...props
}) => (
  <div className={cn('app-filter-panel', className)} {...props}>
    {children}
  </div>
);

interface FilterMoreButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  open: boolean;
  openLabel?: string;
  closedLabel?: string;
  className?: string;
}

export const FilterMoreButton: React.FC<FilterMoreButtonProps> = ({
  open,
  openLabel = 'Menos filtros',
  closedLabel = 'Mas filtros',
  className,
  ...props
}) => (
  <Button
    type="button"
    variant={open ? 'primary' : 'secondary'}
    className={cn('app-filter-more-button', className)}
    {...props}
  >
    <span>{open ? openLabel : closedLabel}</span>
  </Button>
);
