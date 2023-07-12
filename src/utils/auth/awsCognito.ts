import { Amplify, Auth } from "aws-amplify";
import got from "got";

async function login(
  username: string,
  password: string,
  region: string,
  userPoolId: string,
  clientId: string
): Promise<{
  authId: string;
  idToken: string;
  accessToken: string;
}> {
  Amplify.configure({
    Auth: {
      region,
      userPoolId,
      userPoolWebClientId: clientId,
    },
  });

  const user = await Auth.signIn(username, password);
  const authId = user?.username;
  const idToken = user?.signInUserSession?.idToken?.jwtToken;
  const accessToken = user?.signInUserSession?.accessToken?.jwtToken;

  if (!idToken || !accessToken) {
    throw Error(`Invalid auth response: ${JSON.stringify(user, null, 2)}`);
  }

  return {
    authId,
    idToken,
    accessToken,
  };
}

export async function awsCognito(
  authorization: string
): Promise<got.BeforeRequestHook<got.GotBodyOptions<null>>> {
  const [, username, password, region, userPoolId, clientId] = authorization.split(/\s+/);
  
  const { accessToken } = await login(
    username,
    password,
    region,
    userPoolId,
    clientId
  );

  return async (options) => {
    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    };
  };
}
