import React from "react";
import { DividerBox } from "rc-dock";
import { Redirect, Route, Switch } from "react-router-dom";
import styled from "styled-components";
import { ActivityConfig } from "_activities_config";
import { Row, Col, Container } from "reactstrap";

const StyledSidebar = styled(DividerBox)<{ $width: string; $minWidth: string }>`
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    width: ${(props) => props.$width};
    min-width: ${(props) => props.$minWidth};
    background-color: ${(props) => props.theme.colors.sidebarBackground};
    color: ${(props) => props.theme.colors.sidebarForeground};
`;

const Title = styled.div`
    display: flex;
    height: 40px;
    background-color: ${(props) => props.theme.colors.sidebarTitle};
    color: ${(props) => props.theme.colors.sidebarForeground};
    padding: 0;
    margin: 0;
    width: 100%;
    align-items: center;
    justify-content: center;
    font-size: 80%;
`;

type Props = {
    width: string;
    minWidth: string;
    activities: ActivityConfig[];
};

const Sidebar: React.FC<Props> = ({ width, minWidth, activities }) => {
    const routeTitles = activities.map(
        (activity: ActivityConfig, idx: number) => (
            <Route
                key={idx}
                path={activity.urlPath}
                exact={false}
                component={() => <Title>{activity.name.toUpperCase()}</Title>}
            />
        )
    );

    const routeSidebars = activities.map(
        (activity: ActivityConfig, idx: number) => {
            const Comp = activity.component;
            return (
                <Route
                    key={idx}
                    path={activity.urlPath}
                    exact={false}
                    component={() => <Comp />}
                />
            );
        }
    );

    const defaultPath = activities.find((a) => a.default)!.urlPath;

    return (
        <StyledSidebar $width={width} $minWidth={minWidth}>
            <Container fluid>
                <Row>
                    <Col lg="12" className="pr-0 pl-0">
                        <Switch>{routeTitles}</Switch>
                    </Col>
                    <Col lg="12" className="pt-2 pr-0 pl-0">
                        <Switch>
                            {routeSidebars}
                            <Redirect from="/" to={defaultPath} />
                        </Switch>
                    </Col>
                </Row>
            </Container>
        </StyledSidebar>
    );
};

export default Sidebar;
