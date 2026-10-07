import { cn } from "../../lib/cn";

/**
 * EmptyState — one icon, one line of context, one optional action.
 */
export default function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-10 px-6", className)}>
      {Icon && <Icon className="w-5 h-5 text-text-dim mb-3 stroke-[1.75]" aria-hidden="true" />}
      <p className="text-sm font-medium text-text m-0">{title}</p>
      {description && (
        <p className="text-sm text-text-dim m-0 mt-1 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
