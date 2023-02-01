import React from "react";
import { Container, Row, Col } from "reactstrap";

export type PickerOption = { checked: boolean; value: string };
export type PickerList = { [key: string]: PickerOption };

type Props = {
    options: PickerList;
    onClickOption?: (key: string, option: PickerOption) => void;
};

export const Picker = ({ options, onClickOption = () => {} }: Props) => {
    const rows = Object.keys(options).map((key) => (
        <Row
            key={key}
            className="mt-1"
            onClick={() => onClickOption(key, options[key])}
            style={{ alignItems: "center" }}
        >
            <Col lg="2">
                <input
                    type="checkbox"
                    checked={options[key].checked}
                    readOnly
                />
            </Col>
            <Col>{options[key].value}</Col>
        </Row>
    ));

    return <Container fluid>{rows}</Container>;
};
