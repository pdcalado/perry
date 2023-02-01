import React, { forwardRef, useImperativeHandle, useState } from "react";
import { BasicModal, BasicModalProps } from "components";
import { SetModalProps } from "./tabsAPI";

export type ModalRef = {
    setModalProps: SetModalProps;
};

export const ModalContainer = forwardRef((props, ref) => {
    const [modalProps, setModalProps] = useState<BasicModalProps | null>(null);

    const localModalProps = modalProps || { isOpen: false, toggle: () => {} };

    useImperativeHandle(
        ref,
        () =>
            ({
                setModalProps: setModalProps,
            } as ModalRef)
    );

    return <BasicModal {...localModalProps} fade={false} />;
});
