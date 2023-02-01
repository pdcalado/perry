import React, { useState, useContext } from "react";
import styled from "styled-components";
import { ContextMenu as Menu } from "primereact/contextmenu";

/**
 * MenuItem inspired in primereact.
 * https://github.com/primefaces/primereact/blob/master/src/components/menuitem/MenuItem.d.ts
 */
export interface ContextMenuItem {
    /**
     * Text label for the menu item to present.
     */
    label?: string;
    /**
     * Nested items to show, if any.
     */
    items?: ContextMenuItem[] | ContextMenuItem[][];
    /**
     * Set to true if item should be shown as disabled.
     */
    disabled?: boolean;
    /**
     * Set to true to show this item as a separator.
     */
    separator?: boolean;
    /**
     * Pass a custom style for this item.
     */
    style?: any;
    /**
     * Set a specific class name to this item.
     */
    className?: string;
    /**
     * Function to be called when this item is clicked on.
     */
    command?: (e: { originalEvent: Event; item: ContextMenuItem }) => void;
}

const ContextMenu = styled(Menu)`
    position: absolute;

    font-size: ${(props) => props.theme.sizes.defaultFont};
    color: ${(props) => props.theme.colors.defaultForeground};
    background: ${(props) => props.theme.colors.dropdownBackground};
    border: none !important;
    box-shadow: 0 0 5px black;
    ul,
    ol {
        padding: 0;
        margin: 0;
        list-style: none;
    }

    .p-submenu-list {
        position: absolute;
        min-width: 100%;
        z-index: 1;
    }

    .p-menuitem {
        position: relative;
        padding: 0;
        margin: 0;
    }

    .p-menuitem-link {
        cursor: pointer;
        display: flex;
        align-items: center;
        text-decoration: none;
        overflow: hidden;
        position: relative;
        padding: 2px;
        margin-top: 3px;
        margin-bottom: 3px;
        padding-left: 20px;
        padding-right: 20px;
    }

    .p-menuitem:hover {
        cursor: pointer;
        background-color: ${(props) =>
            props.theme.colors.menuItemHover} !important;
    }

    a,
    a:hover,
    a:visited,
    a:link {
        color: inherit !important;
        text-decoration: none;
        outline: none;
    }
`;

/**
 * Type of the function to be called when showing the menu.
 */
export type ContextMenuShow = (
    /**
     * Mouse event grabbed for calling the menu.
     */
    e: React.MouseEvent,
    /**
     * Items to show on the menu.
     */
    items: ContextMenuItem[]
) => void;

/**
 * @field show - this method must be called to show the context menu
 */
export type ContextProps = {
    show: ContextMenuShow;
};

/**
 * Props of the provider
 */
export type ContextMenuProviderProps = {
    /**
     * Top level component to which the menu will be attached.
     */
    appendTo?: HTMLElement;
    children: React.ReactElement;
};

const ProviderContext = React.createContext<ContextProps | null>(null);

/**
 * React hook for using context menu.
 *
 * @returns Props from `ContextProps`
 */
export const useContextMenu = () => useContext(ProviderContext)!;

/**
 * Provider for the ContextMenu
 *
 * @param `ContextMenuProviderProps`: make sure to append to top level component or `root`
 */
export const ContextMenuProvider = ({
    appendTo = document.getElementById("root")!,
    children,
}: ContextMenuProviderProps) => {
    const [ref, setRef] = useState<any>(null);
    const [items, setItems] = useState<ContextMenuItem[]>([]);

    const show = (e: React.MouseEvent, menuItems: ContextMenuItem[]) => {
        if (ref.state.visible) {
            ref.hide(e);
            e.preventDefault();
        } else {
            ref.show(e);
            setItems(menuItems);
        }
    };

    return (
        <ProviderContext.Provider value={{ show }}>
            <React.Fragment>
                <ContextMenu
                    model={items}
                    ref={(el) => setRef(el)}
                    appendTo={appendTo}
                />
                {children}
            </React.Fragment>
        </ProviderContext.Provider>
    );
};
