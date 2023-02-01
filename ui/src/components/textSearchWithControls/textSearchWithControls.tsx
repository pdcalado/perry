import React, { useState } from "react";
import { ButtonDropdown, DropdownToggle } from "reactstrap";
import {
    BasicMenu,
    Picker,
    PickerList,
    PickerOption,
    SearchInput,
} from "components";
import styled from "styled-components";
import { Cog } from "icons";

export type Picked = PickerList;
export type OnPick = (key: string, option: PickerOption) => void;

const Toggle = styled(DropdownToggle)<{ variant: string }>`
    background-color: ${(props) => props.theme.colors.variants} !important;
`;

type Props = {
    loading?: boolean;
    textInput: string;
    textSearchable: Picked;
    onTextChange?: (text: string) => void;
    onPickAttribute?: OnPick;
};

export const TextSearchWithControls = ({
    loading = false,
    textInput,
    textSearchable,
    onTextChange,
    onPickAttribute,
}: Props) => {
    const append = (
        <Controls picked={textSearchable} onPick={onPickAttribute} />
    );

    const onChange = onTextChange
        ? (event: React.ChangeEvent<HTMLInputElement>) =>
              onTextChange(event.target.value)
        : () => {};

    return (
        <SearchInput
            text={textInput}
            onChange={onChange}
            loading={loading}
            append={append}
        />
    );
};

type ControlsProps = {
    picked: Picked;
    onPick?: OnPick;
    variant?: string;
    icon?: React.ReactNode;
    size?: string;
};

const Controls = ({
    picked,
    onPick,
    variant = "primary",
    icon = <Cog size="lg" />,
    size = "sm",
}: ControlsProps) => {
    const [showControls, setShowControls] = useState(false);

    const toggle = (key: string, option: PickerOption) => {
        if (!(key in picked)) return;

        const newOption = { ...picked[key]! };
        newOption.checked = !option.checked;
        onPick && onPick(key, newOption);
    };

    const toggleShowControls = () => setShowControls(!showControls);

    return (
        <ButtonDropdown isOpen={showControls} toggle={toggleShowControls}>
            <Toggle
                data-toggle="dropdown"
                aria-expanded={showControls}
                size={size}
                variant={variant}
            >
                {icon}
            </Toggle>
            <BasicMenu>
                <Picker options={picked} onClickOption={toggle} />
            </BasicMenu>
        </ButtonDropdown>
    );
};
