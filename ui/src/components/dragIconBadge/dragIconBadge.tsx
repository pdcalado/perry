import React from "react";
import { Badge } from "reactstrap";
import styled from "styled-components";

type Props = {
    id: string;
    show: boolean;
    iconComponent: React.ReactNode;
    badgeColor?: string;
    badgeValue?: number;
};

const Div = styled.div<{ show: boolean }>`
    display: ${(props) => (props.show ? "block" : "none")};
    position: absolute;
    top: -1000px;
`;

export const DragIconBadge = ({
    id,
    show,
    iconComponent,
    badgeColor,
    badgeValue = 0,
}: Props) => (
    <Div id={id} show={show}>
        {iconComponent}
        <Badge pill color={badgeColor || "primary"}>
            {badgeValue}
        </Badge>
    </Div>
);
