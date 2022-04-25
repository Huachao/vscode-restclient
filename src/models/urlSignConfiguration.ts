export type UrlSignConfiguration = {
    enableUrlSign: boolean,
    // See aliyun sign algo: https://help.aliyun.com/document_detail/30563.htm
    algorithm: {
        // Step 1: Canonicalized Query String
        step1OrderParams: boolean;
        step1UrlEncodeParams: boolean;
        step1PercentEncode: boolean;
        step1AddEqual: boolean;
        step1AddAnd: boolean;
        // Step 2: Construct signature string StringToSign
        step2SeparatorAnd: boolean;
        step2AddHttpMethod: boolean;
        step2AddPercentEncodeSlash: boolean;
        step2PercentEncode: boolean;
        // Step 3: Compute sign
        step3ComputeAlgorithm: string;    // md5 | hmacsha1
        step3SecretAppend: string; // like: '&' in aliyun
        step3TextAlgorithm: string;    // hex | base64
    }
    keyParamName: string;    // appkey | AccessKeyId | ...
    signParamName: string;  // sign | Signature | ...
}
