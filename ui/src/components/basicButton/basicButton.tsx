import React from "react";
import { Button, ButtonProps } from "reactstrap";
import styled from "styled-components";

export interface BasicButtonProps extends ButtonProps {}

const StyledButton = styled(Button)`
    background-color: ${(props) => props.theme.colors.variants} !important;
    color: ${(props) => props.theme.colors.white} !important;

    border-radius: 0 !important;
`;

export const BasicButton: React.FC<BasicButtonProps> = ({
    children,
    ...props
}) => (
    <StyledButton {...props} size="sm" variant={props.variant || "default"}>
        {children}
    </StyledButton>
);
