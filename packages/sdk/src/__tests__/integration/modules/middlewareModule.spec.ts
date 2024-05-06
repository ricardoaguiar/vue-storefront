/* eslint-disable @typescript-eslint/no-unused-vars */
import "isomorphic-fetch";
import { initSDK, buildModule } from "../../../index";
import {
  middlewareModule,
  prepareConfig,
  isCausedBySdkHttpError,
  isSpecificSdkHttpError,
  isSdkRequestError,
  isSdkUnauthorizedError,
  SdkHttpError,
} from "../../../modules/middlewareModule";
import { Endpoints } from "../../__mocks__/apiClient/types";

const axios = require("axios/dist/node/axios.cjs");

describe("middlewareModule", () => {
  it("should be able to be used as standard SDK module", async () => {
    const sdkConfig = {
      commerce: buildModule(middlewareModule, {
        apiUrl: "http://localhost:8181/commerce",
      }),
    };

    const sdk = initSDK(sdkConfig);

    expect(sdk.commerce).toBeDefined();
  });

  it("should use generic types to define the endpoints", async () => {
    const sdkConfig = {
      commerce: buildModule(middlewareModule<Endpoints>, {
        apiUrl: "http://localhost:8181/commerce",
      }),
    };

    const sdk = initSDK(sdkConfig);

    expect(sdk.commerce.getProduct).toBeInstanceOf(Function);
    expect(sdk.commerce.getProducts).toBeInstanceOf(Function);
  });

  it("should allow to override the default HTTP Client", async () => {
    const customHttpClient = jest.fn();
    const sdkConfig = {
      commerce: buildModule(middlewareModule<Endpoints>, {
        apiUrl: "http://localhost:8181/commerce",
        httpClient: customHttpClient,
      }),
    };
    const sdk = initSDK(sdkConfig);

    await sdk.commerce.getProduct({ id: 1 });

    expect(customHttpClient).toHaveBeenCalled();
  });

  it("should send a POST request to <BASE_URL>/<METHOD_NAME> by default", async () => {
    const customHttpClient = jest.fn();
    const sdkConfig = {
      commerce: buildModule(middlewareModule<Endpoints>, {
        apiUrl: "http://localhost:8181/commerce",
        httpClient: customHttpClient,
      }),
    };
    const sdk = initSDK(sdkConfig);

    await sdk.commerce.getProduct({ id: 1 });

    expect(customHttpClient).toHaveBeenCalledWith(
      "http://localhost:8181/commerce/getProduct",
      [{ id: 1 }],
      expect.objectContaining({
        method: "POST",
      })
    );
  });

  it("should use default HTTP Client if it's not provided", async () => {
    const sdkConfig = {
      commerce: buildModule(middlewareModule<Endpoints>, {
        apiUrl: "http://localhost:8181/commerce",
      }),
    };
    const sdk = initSDK(sdkConfig);

    const response = await sdk.commerce.getProduct({ id: 1 });

    // To avoid mocking fetch, we're calling the real middleware and verifying the response.
    expect(response).toEqual({ id: 1, name: "Test Product" });
  });

  it("should allow to use GET request with query parameters", async () => {
    const customHttpClient = jest.fn();
    const sdkConfig = {
      commerce: buildModule(middlewareModule<Endpoints>, {
        apiUrl: "http://localhost:8181/commerce",
        httpClient: customHttpClient,
      }),
    };
    const sdk = initSDK(sdkConfig);

    await sdk.commerce.getProducts(
      { limit: 1 },
      prepareConfig({ method: "GET" })
    );

    expect(customHttpClient).toHaveBeenCalledWith(
      `http://localhost:8181/commerce/getProducts?body=${encodeURIComponent(
        JSON.stringify([{ limit: 1 }])
      )}`,
      [],
      expect.objectContaining({
        method: "GET",
      })
    );
  });

  it("should allow to use GET request when apiUrl is a path", async () => {
    const customHttpClient = jest.fn();
    const sdkConfig = {
      commerce: buildModule(middlewareModule<Endpoints>, {
        apiUrl: "/api/commerce",
        httpClient: customHttpClient,
      }),
    };
    const sdk = initSDK(sdkConfig);

    await sdk.commerce.getProducts(
      { limit: 1 },
      prepareConfig({ method: "GET" })
    );

    expect(customHttpClient).toHaveBeenCalledWith(
      `/api/commerce/getProducts?body=${encodeURIComponent(
        JSON.stringify([{ limit: 1 }])
      )}`,
      [],
      expect.objectContaining({
        method: "GET",
      })
    );
  });

  it("should normalize the url", async () => {
    const customHttpClient = jest.fn();
    const sdkConfig = {
      commerce: buildModule(middlewareModule<Endpoints>, {
        apiUrl: "http://localhost:8181/commerce///", // Extra slashes
        httpClient: customHttpClient,
      }),
    };
    const sdk = initSDK(sdkConfig);

    await sdk.commerce.getProduct({ id: 1 });

    expect(customHttpClient).toHaveBeenCalledWith(
      "http://localhost:8181/commerce/getProduct",
      expect.any(Array),
      expect.any(Object)
    );
  });

  it("should allow to use custom headers", async () => {
    const customHttpClient = jest.fn();
    const sdkConfig = {
      commerce: buildModule(middlewareModule<Endpoints>, {
        apiUrl: "http://localhost:8181/commerce",
        httpClient: customHttpClient,
      }),
    };
    const sdk = initSDK(sdkConfig);

    await sdk.commerce.getProduct(
      { id: 1 },
      prepareConfig({
        method: "POST",
        headers: {
          "X-Test": "x-test-header",
        },
      })
    );

    expect(customHttpClient).toHaveBeenCalledWith(
      "http://localhost:8181/commerce/getProduct",
      expect.any(Array),
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Test": "x-test-header",
        },
      })
    );
  });

  it("should allow to define default headers", async () => {
    const customHttpClient = jest.fn();
    const sdkConfig = {
      commerce: buildModule(middlewareModule<Endpoints>, {
        apiUrl: "http://localhost:8181/commerce",
        httpClient: customHttpClient,
        defaultRequestConfig: {
          headers: {
            "X-Test": "x-test-header",
          },
        },
      }),
    };
    const sdk = initSDK(sdkConfig);

    await sdk.commerce.getProduct({ id: 1 });

    expect(customHttpClient).toHaveBeenCalledWith(
      "http://localhost:8181/commerce/getProduct",
      expect.any(Array),
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Test": "x-test-header",
        },
      })
    );
  });

  it("should use different base URL during SSR if defined", async () => {
    const customHttpClient = jest.fn();
    const sdkConfig = {
      commerce: buildModule(middlewareModule<Endpoints>, {
        apiUrl: "/api/commerce",
        ssrApiUrl: "http://localhost:8181/commerce",
        httpClient: customHttpClient,
      }),
    };
    const sdk = initSDK(sdkConfig);

    await sdk.commerce.getProduct({ id: 1 });

    expect(customHttpClient).toHaveBeenCalledWith(
      "http://localhost:8181/commerce/getProduct",
      expect.any(Array),
      expect.any(Object)
    );
  });

  it("should be able to use axios as a custom HTTP client", async () => {
    expect.assertions(2);

    const sdkConfig = {
      commerce: buildModule(middlewareModule<Endpoints>, {
        apiUrl: "http://localhost:8181/commerce",
        httpClient: async (url, params, config) => {
          const { data } = await axios(url, {
            ...config,
            data: params,
          });
          return data;
        },
      }),
    };
    const sdk = initSDK(sdkConfig);

    const postResponse = await sdk.commerce.getProduct({ id: 1 });
    const getResponse = await sdk.commerce.getProduct(
      { id: 2 },
      prepareConfig({ method: "GET" })
    );

    expect(postResponse).toEqual({ id: 1, name: "Test Product" });
    expect(getResponse).toEqual({ id: 2, name: "Test Product" });
  });

  it("should accept headers as Record<string | string[]>", async () => {
    const customHttpClient = jest.fn();
    const sdkConfig = {
      commerce: buildModule(middlewareModule<Endpoints>, {
        apiUrl: "http://localhost:8181/commerce",
        httpClient: customHttpClient,
        defaultRequestConfig: {
          headers: {
            "X-Test-Default": ["x-test-header", "x-test-header-2"],
          },
        },
      }),
    };
    const sdk = initSDK(sdkConfig);

    await sdk.commerce.getProduct(
      { id: 1 },
      prepareConfig({
        method: "POST",
        headers: {
          "X-Test": ["x-test-header", "x-test-header-2"],
        },
      })
    );

    expect(customHttpClient).toHaveBeenCalledWith(
      "http://localhost:8181/commerce/getProduct",
      expect.any(Array),
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Test-Default": "x-test-header,x-test-header-2",
          "X-Test": "x-test-header,x-test-header-2",
        },
      })
    );
  });

  it("should throw an error if the error handler is not provided", async () => {
    expect.assertions(1);

    const error = new Error("Test error");
    const customHttpClient = jest.fn().mockRejectedValue(error);
    const sdkConfig = {
      commerce: buildModule(middlewareModule<Endpoints>, {
        apiUrl: "http://localhost:8181/commerce",
        httpClient: customHttpClient,
      }),
    };
    const sdk = initSDK(sdkConfig);

    try {
      await sdk.commerce.getProduct({ id: 1 });
    } catch (err) {
      expect(err).toEqual(error);
    }
  });

  it("should allow to use custom error handler", async () => {
    const error = new Error("Test error");
    const customErrorHandler = jest
      .fn()
      .mockResolvedValue({ id: 1, name: "Error handler did a good job" });
    const customHttpClient = jest.fn().mockRejectedValue(error);
    const sdkConfig = {
      commerce: buildModule(middlewareModule<Endpoints>, {
        apiUrl: "http://localhost:8181/commerce",
        httpClient: customHttpClient,
        errorHandler: customErrorHandler,
      }),
    };
    const sdk = initSDK(sdkConfig);

    const res = await sdk.commerce.getProduct({ id: 1 });
    expect(customErrorHandler).toHaveBeenCalledWith({
      error,
      methodName: "getProduct",
      url: "http://localhost:8181/commerce/getProduct",
      params: [{ id: 1 }],
      config: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
      httpClient: customHttpClient,
    });
    expect(res).toEqual({ id: 1, name: "Error handler did a good job" });
  });

  it("should allow to use non-object params", async () => {
    const sdkConfig = {
      commerce: buildModule(middlewareModule<Endpoints>, {
        apiUrl: "http://localhost:8181/commerce",
      }),
    };
    const sdk = initSDK(sdkConfig);

    // This is a real call to the middleware, so we're verifying the response, to check if the request was successful.
    const res = await sdk.commerce.getCategory(1);
    expect(res).toEqual({ id: 1, name: "Test Category" });
  });

  it("should allow to add new methods with a standard extension", async () => {
    const sdk = initSDK({
      commerce: buildModule(
        middlewareModule<Endpoints>,
        {
          apiUrl: "http://localhost:8181/commerce",
        },
        {
          extend: {
            customMethod: async (params: { id: number }) => {
              return { id: params.id, name: "Custom method" };
            },
          },
        }
      ),
    });

    const res = await sdk.commerce.customMethod({ id: 1 });

    expect(res).toEqual({ id: 1, name: "Custom method" });
  });

  it("should allow to reuse the request sender in extensions", async () => {
    const customHttpClient = jest
      .fn()
      .mockResolvedValue({ id: 1, name: "Custom method" });
    const sdk = initSDK({
      commerce: buildModule(
        middlewareModule<Endpoints>,
        {
          apiUrl: "http://localhost:8181/commerce",
          httpClient: customHttpClient,
        },
        (_, module) => ({
          extend: {
            customMethod: async (params: { id: number }) => {
              return module?.context?.requestSender("customMethod", [params]);
            },
          },
        })
      ),
    });

    await sdk.commerce.customMethod({ id: 1 });

    expect(customHttpClient).toHaveBeenCalledWith(
      "http://localhost:8181/commerce/customMethod",
      [{ id: 1 }],
      expect.objectContaining({
        method: "POST",
      })
    );
  });

  it("should allow to use custom error handler in extensions", async () => {
    const error = new Error("Test error");
    const customErrorHandler = jest
      .fn()
      .mockResolvedValue({ id: 1, name: "Error handler did a good job" });
    const customHttpClient = jest.fn().mockRejectedValue(error);
    const sdk = initSDK({
      commerce: buildModule(
        middlewareModule<Endpoints>,
        {
          apiUrl: "http://localhost:8181/commerce",
          httpClient: customHttpClient,
          errorHandler: customErrorHandler,
        },
        (_, module) => ({
          extend: {
            /**
             * Custom method.
             * TSDoc to test if it's visible.
             */
            customMethod: async (params: { id: number }) => {
              return module?.context?.requestSender("customMethod", [params]);
            },
          },
        })
      ),
    });

    const res = await sdk.commerce.customMethod({ id: 1 });
    expect(customErrorHandler).toHaveBeenCalledWith({
      error,
      methodName: "customMethod",
      params: [{ id: 1 }],
      url: "http://localhost:8181/commerce/customMethod",
      config: expect.any(Object),
      httpClient: customHttpClient,
    });
    expect(res).toEqual({ id: 1, name: "Error handler did a good job" });
  });

  it("should allow to override SDK methods in extensions", async () => {
    const sdk = initSDK({
      commerce: buildModule(
        middlewareModule<Endpoints>,
        {
          apiUrl: "http://localhost:8181/commerce",
        },
        {
          override: {
            /**
             * Get the product by id.
             * TSDoc to test if it's also overridden.
             */
            getProduct: async (params: { id: number }) => {
              return { id: params.id, name: "Custom method" };
            },
          },
        }
      ),
    });

    const res = await sdk.commerce.getProduct({ id: 1 });

    expect(res).toEqual({ id: 1, name: "Custom method" });
  });

  it("should make a method throw if httpClient callback throws", async () => {
    expect.assertions(6);
    const sdk = initSDK({
      commerce: buildModule(middlewareModule<Endpoints>, {
        apiUrl: "http://localhost:8181/commerce",
      }),
    });

    try {
      // This is a real request to the middleware, invalid endpoint throws { statusCode: 401, message: "Unauthorized" }
      await sdk.commerce.unauthorized();
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(isCausedBySdkHttpError(err)).toBe(true);
      expect(isSpecificSdkHttpError(err, { statusCode: 401 })).toBe(true);
      expect(
        isSpecificSdkHttpError(err, {
          statusCode: (statusCode) => statusCode === 401,
        })
      ).toBe(true);
      expect(isSdkRequestError(err)).toBe(true);
      expect(isSdkUnauthorizedError(err)).toBe(true);
    }
  });

  it("should make a method throw if custom httpClient callback throws", async () => {
    expect.assertions(6);

    const sdk = initSDK({
      commerce: buildModule(middlewareModule<Endpoints>, {
        apiUrl: "http://localhost:8181/commerce",
        httpClient: async (url, params, config) => {
          try {
            const { data } = await axios(url, {
              ...config,
              data: params,
              withCredentials: true,
            });

            return data;
          } catch (err: any) {
            throw new SdkHttpError({
              statusCode: err?.response?.status || 500,
              message: err?.response?.data?.message || err.message,
              cause: err,
            });
          }
        },
      }),
    });

    try {
      // This is a real request to the middleware, invalid endpoint throws { statusCode: 401, message: "Unauthorized" }
      await sdk.commerce.unauthorized();
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(isCausedBySdkHttpError(err)).toBe(true);
      expect(isSpecificSdkHttpError(err, { statusCode: 401 })).toBe(true);
      expect(
        isSpecificSdkHttpError(err, {
          statusCode: (statusCode) => statusCode === 401,
        })
      ).toBe(true);
      expect(isSdkRequestError(err)).toBe(true);
      expect(isSdkUnauthorizedError(err)).toBe(true);
    }
  });

  it("should return undefined, when method is void", async () => {
    const sdk = initSDK({
      commerce: buildModule(middlewareModule<Endpoints>, {
        apiUrl: "http://localhost:8181/commerce",
      }),
    });

    const res = await sdk.commerce.logout();

    expect(res).toBeUndefined();
  });

  it("should use method-specific configuration over default", async () => {
    const customHttpClient = jest.fn();

    const sdk = initSDK({
      commerce: buildModule(middlewareModule<Endpoints>, {
        apiUrl: "http://localhost:8181/commerce",
        httpClient: customHttpClient,
        defaultRequestConfig: {
          headers: {
            "X-Test": "Test",
          },
        },
        methodsRequestConfig: {
          getProduct: {
            method: "GET",
            headers: {
              "X-Test": "Test-Get",
            },
          },
        },
      }),
    });

    // Method-specific configuration should be used
    await sdk.commerce.getProduct({ id: 1 });

    expect(customHttpClient).toHaveBeenCalledWith(
      `http://localhost:8181/commerce/getProduct?body=${encodeURIComponent(
        JSON.stringify([{ id: 1 }])
      )}`,
      [],
      expect.objectContaining({
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Test": "Test-Get",
        },
      })
    );

    // Request-specific configuration should be used
    await sdk.commerce.getProduct({ id: 1 }, prepareConfig({ method: "POST" }));

    expect(customHttpClient).toHaveBeenCalledWith(
      `http://localhost:8181/commerce/getProduct`,
      [{ id: 1 }],
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Test": "Test-Get",
        },
      })
    );

    // Default configuration should be used
    await sdk.commerce.getProducts({ limit: 1 });

    expect(customHttpClient).toHaveBeenCalledWith(
      "http://localhost:8181/commerce/getProducts",
      [{ limit: 1 }],
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Test": "Test",
        },
      })
    );
  });

  it("should use default method type if not specified", async () => {
    const customHttpClient = jest.fn();

    const sdk = initSDK({
      commerce: buildModule(middlewareModule<Endpoints>, {
        apiUrl: "http://localhost:8181/commerce",
        httpClient: customHttpClient,
        defaultRequestConfig: {
          method: "GET",
        },
      }),
    });

    await sdk.commerce.getProduct({ id: 1 });

    expect(customHttpClient).toHaveBeenCalledWith(
      `http://localhost:8181/commerce/getProduct?body=${encodeURIComponent(
        JSON.stringify([{ id: 1 }])
      )}`,
      [],
      expect.objectContaining({
        method: "GET",
      })
    );

    await sdk.commerce.getProducts({ limit: 1 });

    expect(customHttpClient).toHaveBeenCalledWith(
      `http://localhost:8181/commerce/getProducts?body=${encodeURIComponent(
        JSON.stringify([{ limit: 1 }])
      )}`,
      [],
      expect.objectContaining({
        method: "GET",
      })
    );
  });
});
