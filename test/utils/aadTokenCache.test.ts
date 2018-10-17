'use strict';

import * as adal from 'adal-node';
import * as assert from 'assert';
import { AadTokenCache } from '../../src/utils/aadTokenCache';

// Defines a Mocha test suite to group tests of similar kind together
suite("AadTokenCache Tests", function () {

    // Defines a Mocha unit test
    test("Saves and retrieves the same value", function() {
        const key = "testkey";
        const value: adal.TokenResponse = {
            accessToken: "testvalue",
            tokenType: "Bearer",
            expiresIn: 0,
            expiresOn: null,
            resource: "https://graph.windows.net"
        };
        AadTokenCache.set(key, value);

        assert.equal(AadTokenCache.get(key), value);
    });
});