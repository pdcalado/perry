import React from "react";
import { UncontrolledDropdown, DropdownToggle, Nav, Navbar } from "reactstrap";
import styled from "styled-components";
import { BasicMenuItem, BasicMenu, BasicMenuDivider } from "components";

const BrandWrap = styled.div<{ $width: string }>`
    display: flex;
    justify-content: center;
    margin: 0;
    padding: 0;
    width: ${(props) => props.$width};
`;

/**
 * Item of a menu bar.
 * The type is the same for parent and child items, but the behavior is different.
 * Check documentation for each of the fields.
 */
export type MenuBarNavItem = {
    /**
     * `divider` is ignored for parent items (at the level of "File", "View" etc).
     * `divider` shows a divider bar between child items.
     */
    divider?: boolean;
    /**
     * `key` must be unique or unexpected behaviors may occur.
     */
    key: string;
    /**
     * Empty `title` yields the string "none", should be empty only for dividers.
     */
    title?: string;
    /**
     * `icon` always shows on the left.
     */
    icon?: React.ReactNode;
    onClick?: () => void;
    /**
     * `items` of child items are not yet supported, only used for parent items.
     */
    items?: MenuBarNavItem[];
};

const NavbarMenu = styled(Nav)`
    font-size: 12px;

    .nav-link {
        padding-left: 10px !important;
        padding-right: 10px !important;
        color: ${(props) => props.theme.colors.defaultForeground} !important;
        text-decoration: none !important;

        &:hover {
            background-color: ${(props) =>
                props.theme.colors.navbarItemHover} !important;
        }
    }
`;

const StyledBasicMenu = styled(BasicMenu)`
    margin-top: 0 !important;
    box-shadow: 3px 3px 5px black;
    font-size: 12px !important;
`;

export const MenuBar = ({
    brandContainerWidth,
    brandSource,
    items,
}: {
    brandContainerWidth: string;
    brandSource: string;
    items: MenuBarNavItem[];
}) => {
    const menus = items.map((item) => {
        const subItems = item.items?.map((subItem) =>
            subItem.divider ? (
                <BasicMenuDivider key={subItem.key} />
            ) : (
                <BasicMenuItem key={subItem.key} onClick={subItem.onClick}>
                    <span>
                        {subItem.icon ? (
                            <span className="mr-2">{subItem.icon}</span>
                        ) : null}
                        {subItem.title || "none"}
                    </span>
                </BasicMenuItem>
            )
        );
        return (
            <UncontrolledDropdown nav inNavbar key={item.key}>
                <DropdownToggle nav>{item.title}</DropdownToggle>
                {subItems && <StyledBasicMenu>{subItems}</StyledBasicMenu>}
            </UncontrolledDropdown>
        );
    });

    return (
        <Navbar className="m-0 p-0" expand="md">
            <BrandWrap $width={brandContainerWidth}>
                <img className="brand" src={brandSource} alt={"perry"} />
            </BrandWrap>
            <NavbarMenu className="mr-auto" navbar>
                {menus}
            </NavbarMenu>
        </Navbar>
    );
};
