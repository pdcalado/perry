import React from "react";
import {
    ToastContainer,
    toast,
    ToastContentProps,
    Slide,
    ToastContent,
    ToastOptions,
} from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import styled from "styled-components";
import {
    Times,
    TimesCircle,
    InfoCircle,
    CheckCircle,
    ExclamationTriangle,
} from "icons";
import { Container, Col, Row } from "reactstrap";

const InfoIcon = styled(InfoCircle)`
    color: ${(props) => props.theme.colors.info};
`;
const SuccessIcon = styled(CheckCircle)`
    color: ${(props) => props.theme.colors.success};
`;
const WarnIcon = styled(ExclamationTriangle)`
    color: ${(props) => props.theme.colors.warning};
`;
const ErrorIcon = styled(TimesCircle)`
    color: ${(props) => props.theme.colors.danger};
`;

const iconSize = "lg";

const StyledToastContainer = styled(ToastContainer)`
    .Toastify__toast {
        background-color: ${(props) => props.theme.colors.toastBackground};
        color: ${(props) => props.theme.colors.defaultForeground};
        border: none !important;
        box-shadow: 0 0 5px black;
        font-size: ${(props) => props.theme.sizes.defaultFont};
    }
`;

const CloseButton = ({ closeToast }: ToastContentProps) => (
    <Times onClick={closeToast} />
);

export const ToastProvider = () => (
    <StyledToastContainer
        hideProgressBar={true}
        newestOnTop={true}
        draggable={false}
        closeButton={CloseButton}
        transition={Slide}
    />
);

const Wrapper = (content: ToastContent, icon: React.ReactNode) => (
    <Container fluid>
        <Row>
            <Col xs="2">{icon}</Col>
            <Col xs="10">{content}</Col>
        </Row>
    </Container>
);

export const toastSuccess = (content: ToastContent, options?: ToastOptions) =>
    toast(Wrapper(content, <SuccessIcon size={iconSize} />), options);
export const toastInfo = (content: ToastContent, options?: ToastOptions) =>
    toast(Wrapper(content, <InfoIcon size={iconSize} />), options);
export const toastWarn = (content: ToastContent, options?: ToastOptions) =>
    toast(Wrapper(content, <WarnIcon size={iconSize} />), options);
export const toastError = (content: ToastContent, options?: ToastOptions) =>
    toast(Wrapper(content, <ErrorIcon size={iconSize} />), options);

export { toast };
