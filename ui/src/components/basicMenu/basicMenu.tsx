import React from "react";
import { DropdownMenu, DropdownItem, DropdownItemProps } from "reactstrap";
import styled from "styled-components";

export const BasicMenu = styled(DropdownMenu)`
    font-size: ${(props) => props.theme.sizes.defaultFont} !important;
    padding: 0 !important;
    border: none !important;
    box-shadow: 0 0 5px black;
    background-color: ${(props) =>
        props.theme.colors.dropdownBackground} !important;

    &:focus {
        outline: none !important;
    }
`;

export const BasicMenuItem = styled(DropdownItem)`
    margin-top: 3px;
    margin-bottom: 3px;
    color: ${(props) => props.theme.colors.defaultForeground} !important;
    &:hover {
        background-color: ${(props) =>
            props.theme.colors.menuItemHover} !important;
    }

    &:focus {
        outline: none !important;
    }
`;

const Divider: React.FC = (props: DropdownItemProps) => (
    <DropdownItem divider {...props} />
);

export const BasicMenuDivider = styled(Divider)`
    margin: 4px 12px !important;
    border-color: ${(props) => props.theme.colors.defaultForeground} !important;
`;
