import { Field } from "formik";
import styled from "styled-components";
import { Input } from "reactstrap";

export const InputField = styled(Field)<{ $width?: string }>`
    display: block;
    padding: 3px 5px 3px 5px;
    width: ${(props) => props.$width || "100%"};
    font-size: ${(props) => props.theme.sizes.defaultFont} !important;
    background-color: ${(props) =>
        props.theme.colors.inputBackground} !important;
    color: ${(props) => props.theme.colors.defaultForeground} !important;
    border: solid 1px !important;
    border-radius: 0 !important;
    border-width: 1px 1px 1px 1px !important;
    border-color: ${(props) => props.theme.colors.defaultForeground} !important;

    :focus {
        border-color: ${(props) => props.theme.colors.primary} !important;
    }

    input[type="number"]::-webkit-inner-spin-button,
    input[type="number"]::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }

    input[type="number"] {
        -moz-appearance: textfield; /* Firefox */
    }

    outline: none;
`;

export const InputFile = styled(Input)`
    display: block;
`;
