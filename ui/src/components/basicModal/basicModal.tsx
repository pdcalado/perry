import React from "react";
import {
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    ModalProps,
} from "reactstrap";
import styled from "styled-components";

const StyledModal = styled(Modal)`
    font-size: ${(props) => props.theme.sizes.defaultFont};
    border: none;

    .modal-content {
        background: ${(props) => props.theme.colors.defaultBackground};
        color: ${(props) => props.theme.colors.defaultForeground};
    }

    .modal-header {
        border: none;

        button:focus {
            outline: none;
        }

        .close {
            color: ${(props) => props.theme.colors.defaultForeground};
        }
    }

    .modal-footer {
        border: none;
    }
`;

/**
 * Extends ModalProps from reactstrap:
 * https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/reactstrap/lib/Modal.d.ts
 */
export interface BasicModalProps extends ModalProps {
    header?: React.ReactNode;
    body?: React.ReactNode;
    footer?: React.ReactNode;
    toggle: () => void;
    isOpen: boolean;
}

export const BasicModal = ({
    header,
    body,
    footer,
    toggle,
    isOpen,
    ...props
}: BasicModalProps) => {
    const modalHeader = header ? (
        <ModalHeader toggle={toggle}>{header}</ModalHeader>
    ) : null;
    const modalBody = body ? <ModalBody>{body}</ModalBody> : null;
    const modalFooter = footer ? <ModalFooter>{footer}</ModalFooter> : null;

    return (
        <StyledModal isOpen={isOpen} toggle={toggle} {...props}>
            {modalHeader}
            {modalBody}
            {modalFooter}
        </StyledModal>
    );
};
