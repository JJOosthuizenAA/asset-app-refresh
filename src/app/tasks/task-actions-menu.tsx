import { MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";

type TaskActionsMenuProps = {
    children: ReactNode;
};

export function TaskActionsMenu({ children }: TaskActionsMenuProps) {
    return (
        <details className="action-menu" role="presentation">
            <summary
                className="btn btn-outline btn-icon action-menu__trigger"
                aria-haspopup="menu"
            >
                <MoreHorizontal size={16} aria-hidden="true" />
                <span className="sr-only">More actions</span>
            </summary>
            <div className="action-menu__popover" role="menu">
                {children}
            </div>
        </details>
    );
}
