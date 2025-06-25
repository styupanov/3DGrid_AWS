import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import './index.css'
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import awsExports from './aws-exports';
import { Amplify } from 'aws-amplify';

Amplify.configure(awsExports);
// import { AuthProvider } from "react-oidc-context";
//
// const cognitoAuthConfig = {
//   authority: "https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_EpV8P1Gmq",
//   client_id: "1v9f2fcot7pe44o3rekgp5rinc",
//   redirect_uri: "https://main.d2df7fd2fxet18.amplifyapp.com/",
//   response_type: "code",
//   scope: "phone openid email",
// };

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/*<AuthProvider {...cognitoAuthConfig}>*/}
    <Authenticator
      components={{ Header: () => <div style={{ height: '100px' }}></div> }}
      hideSignUp={true}
      // formFields={{
      //   signIn: {
      //     forgotPassword: {
      //       hidden: true
      //     }
      //   }
      // }}
    >
      <App />
    </Authenticator>
  </React.StrictMode>
)