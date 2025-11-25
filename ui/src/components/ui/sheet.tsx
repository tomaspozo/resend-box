import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface SheetContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SheetContext = React.createContext<SheetContextValue | undefined>(undefined);

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

const Sheet = ({ open, onOpenChange, children }: SheetProps) => {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <SheetContext.Provider value={{ open, onOpenChange }}>
      {open && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => onOpenChange(false)}
            aria-hidden="true"
          />
          {/* Sheet */}
          <div className="relative ml-auto flex w-full max-w-2xl flex-col bg-background shadow-lg transform transition-transform">
            {children}
          </div>
        </div>
      )}
    </SheetContext.Provider>
  );
};

const SheetHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-2 border-b p-6', className)} {...props} />
  ),
);
SheetHeader.displayName = 'SheetHeader';

const SheetTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => {
    const context = React.useContext(SheetContext);
    return (
      <div className="flex items-center justify-between">
        <h2 ref={ref} className={cn('text-lg font-semibold text-foreground', className)} {...props} />
        {context && (
          <Button variant="ghost" size="icon" onClick={() => context.onOpenChange(false)} className="h-6 w-6">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  },
);
SheetTitle.displayName = 'SheetTitle';

const SheetContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex-1 overflow-y-auto p-6', className)} {...props} />
  ),
);
SheetContent.displayName = 'SheetContent';

export { Sheet, SheetHeader, SheetTitle, SheetContent };

