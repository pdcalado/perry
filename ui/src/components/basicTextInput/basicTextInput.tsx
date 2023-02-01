import { Input } from "reactstrap";
import styled from "styled-components";

export const BasicTextInput = styled(Input)`
    font-size: ${(props) => props.theme.sizes.defaultFont} !important;
    background-color: ${(props) =>
        props.theme.colors.inputBackground} !important;
    color: ${(props) => props.theme.colors.defaultForeground} !important;
    border: solid 1px !important;
    border-radius: 0 !important;
    border-width: 1px ${(props) => (props.$borderRight ? "1px" : "0")} 1px
        ${(props) => (props.$borderLeft ? "1px" : "0")} !important;
    border-color: ${(props) => props.theme.colors.defaultForeground} !important;
`;
