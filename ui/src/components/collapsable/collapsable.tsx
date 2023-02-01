import React, { useState } from "react";
import { Container, Col, Row } from "reactstrap";
import styled from "styled-components";
import { AngleDown, AngleRight } from "icons";

type HeaderStyle = {
    open: boolean;
    variant?: string;
};

const Wrapper = styled(Container)`
    border: none;
    color: ${(props) => props.theme.colors.defaultForeground};
`;

const Body = styled(Col)<{ $invert: boolean }>`
    border: solid 1px ${(props) => props.theme.colors.defaultForeground}66;
    border-width: 0 1px 1px 1px;
    background-color: ${(props) => props.theme.colors.defaultBackground};
    color: ${(props) => props.theme.colors.defaultForeground};
    box-shadow: 5px 5px 5px black;
`;

const Header = styled(Col)<HeaderStyle>`
    cursor: pointer;
    border: solid ${(props) => props.theme.colors.defaultForeground}66;
    border-width: 1px 1px ${(props) => (props.open ? "0px" : "1px")} 1px;
    background-color: ${(props) =>
        props.variant
            ? props.theme.colors.variants
            : props.theme.colors.defaultBackground};
    color: ${(props) => props.theme.colors.defaultForeground};
    box-shadow: 5px 5px 5px black;
`;

export type CollapsableProps = {
    title: React.ReactNode;
    backgroundColor?: string;
    variant?: string;
    invertColors?: boolean;
    borderRadius?: string;
    iconOpen?: React.ReactNode;
    iconClosed?: React.ReactNode;
    onChange?: (openOrClose: boolean) => void;
    className?: string;
    initial?: boolean;
};

export const Collapsable: React.FC<CollapsableProps> = ({
    title = <strong>Filter Attributes</strong>,
    variant,
    iconOpen = <AngleDown />,
    iconClosed = <AngleRight />,
    invertColors = true,
    className = "",
    onChange = () => {},
    children,
    initial = false,
}) => {
    const [open, setOpen] = useState<boolean>(initial);
    const icon = open ? iconOpen : iconClosed;

    const openClose = (openOrClose: boolean) => {
        setOpen(openOrClose);
        onChange(openOrClose);
    };

    return (
        <Wrapper className={className} fluid>
            <Row>
                <Header
                    lg="12"
                    className="p-1 pl-2 m-0"
                    onClick={() => openClose(!open)}
                    open={open}
                    variant={variant}
                >
                    <div>
                        {icon}
                        <span className="pl-2">{title}</span>
                    </div>
                </Header>
                <Body
                    lg="12"
                    className="p-1"
                    hidden={!open}
                    $invert={invertColors}
                >
                    {children}
                </Body>
            </Row>
        </Wrapper>
    );
};
