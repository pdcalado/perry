import React from "react";
import { Button, Input, InputGroup, InputGroupAddon } from "reactstrap";
import styled from "styled-components";
import { CircleNotch, Search } from "icons";
import { useTranslation } from "react-i18next";

type Props = {
    text: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    loading?: boolean;
    append?: React.ReactNode;
    icon?: React.ReactNode;
    iconLoading?: React.ReactNode;
    variant?: string;
    placeholder?: string;
    onBlur?: () => void;
    onFocus?: () => void;
    onClick?: () => void;
};

const SearchButton = styled(Button)`
    color: ${(props) => props.theme.colors.defaultForeground} !important;
    background-color: ${(props) => props.theme.colors.variants} !important;
`;

const TextInput = styled(Input)`
    font-size: ${(props) => props.theme.sizes.defaultFont} !important;
    background-color: ${(props) =>
        props.theme.colors.inputBackground} !important;
    color: ${(props) => props.theme.colors.defaultForeground} !important;
    border: solid 1px !important;
    border-radius: 0 !important;
    border-width: 1px ${(props) => (props.$borderRight ? "1px" : "0")} 1px
        ${(props) => (props.$borderLeft ? "1px" : "0")} !important;
    border-color: ${(props) => props.theme.colors.defaultForeground} !important;

    :focus {
        box-shadow: none !important;
        border-color: ${(props) => props.theme.colors.primary} !important;
    }
`;

export const SearchInput = ({
    text = "",
    onChange,
    loading = false,
    append = null,
    icon = <Search />,
    iconLoading = <CircleNotch spin />,
    variant = "primary",
    placeholder,
    onBlur = () => {},
    onFocus = () => {},
    onClick = () => {},
}: Props) => {
    const { t } = useTranslation();
    const prependIcon = !loading ? icon : iconLoading;

    const inputPlaceholder = placeholder || t("typeAnything");

    return (
        <InputGroup>
            {icon && (
                <InputGroupAddon addonType="prepend">
                    <SearchButton type="button" variant={variant} disabled>
                        {prependIcon}
                    </SearchButton>
                </InputGroupAddon>
            )}
            <TextInput
                type="text"
                id="search-input"
                name="search-input"
                $borderLeft={icon === null}
                $borderRight={append === null}
                placeholder={inputPlaceholder}
                value={text}
                onChange={onChange}
                onBlur={onBlur}
                onFocus={onFocus}
                onClick={onClick}
                autoComplete="off"
            />
            <InputGroupAddon addonType="append">{append}</InputGroupAddon>
        </InputGroup>
    );
};
