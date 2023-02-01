import React, { useState } from "react";
import { ButtonDropdown, DropdownToggle } from "reactstrap";
import styled from "styled-components";
import { BasicMenu, BasicMenuItem } from "components";

export type BasicSelectOptions = { [key: string]: string };

const Dropdown = styled(ButtonDropdown)`
    width: 100%;
`;

const Toggle = styled(DropdownToggle)<{ variant: string }>`
    background-color: ${(props) => props.theme.colors.variants} !important;
`;

type Props = {
    options: BasicSelectOptions;
    defaultKey?: string;
    defaultOpen?: boolean;
    onChange: (key: string) => void;
    size?: "sm" | "md" | "lg";
    variant?: string;
};

export const BasicSelect = ({
    options,
    defaultKey,
    defaultOpen = false,
    onChange,
    size = "md",
    variant = "info",
}: Props) => {
    const [dropdownOpen, setOpen] = useState(defaultOpen);
    const [selectedKey, setSelectedKey] = useState(defaultKey);
    const toggle = () => setOpen(!dropdownOpen);

    const main = selectedKey
        ? options[selectedKey]
        : Object.keys(options).length > 0
        ? options[Object.keys(options)[0]]
        : "(none)";

    const onSelect = (key: string) => {
        setSelectedKey(key);
        onChange(key);
    };

    const items = Object.keys(options).map((key) => (
        <BasicMenuItem key={key} onClick={() => onSelect(key)}>
            {options[key]}
        </BasicMenuItem>
    ));

    return (
        <Dropdown isOpen={dropdownOpen} toggle={toggle} size={size}>
            <Toggle caret size={size} variant={variant}>
                {main}
            </Toggle>
            <BasicMenu>{items}</BasicMenu>
        </Dropdown>
    );
};
