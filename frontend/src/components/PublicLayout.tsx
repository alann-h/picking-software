import React from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';

const PublicLayout = () => {
  return (
    <>
      <TopBar disableTopBar={true} />
      <Outlet />
    </>
  );
};

export default PublicLayout;