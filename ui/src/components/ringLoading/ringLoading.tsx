import React from "react";
import loading from "./loading.svg";
import styled from "styled-components";

const RingDiv = styled.div`
    position: absolute;
    display: flex;
    justify-content: center;
    height: 100vh;
    width: 100vw;
    background-color: ${(props) => props.theme.colors.defaultBackground};
`;

export const RingLoading = () => (
    <RingDiv>
        <img src={loading} alt="loading" />
    </RingDiv>
);
