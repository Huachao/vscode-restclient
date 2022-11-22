import { Amplify, Auth } from "aws-amplify";
import got from "got";

async function login(
  Username: string,
  Password: string,
  Region: string,
  UserPoolId: string,
  ClientId: string
): Promise<{
  authId: string;
  idToken: string;
  accessToken: string;
}> {
  Amplify.configure({
    Auth: {
      region: Region,
      userPoolId: UserPoolId,
      userPoolWebClientId: ClientId,
    },
  });

  const user = await Auth.signIn(Username, Password);
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
  const [, Username, Password, Region, UserPoolId, ClientId] =
    authorization.split(/\s+/);
  
  const { accessToken } = await login(
    Username,
    Password,
    Region,
    UserPoolId,
    ClientId
  );

  return async (options) => {
    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    };
  };
}
