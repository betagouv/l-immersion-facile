import { expectPromiseToFailWithError } from "shared";
import { ForbiddenError } from "../../../../../config/helpers/httpErrors";
import { CustomTimeGateway } from "../../../time-gateway/adapters/CustomTimeGateway";
import { AdminLogin } from "./AdminLogin";

const correctToken = "the-token";

describe("AdminLogin", () => {
  let adminLogin: AdminLogin;
  beforeEach(() => {
    adminLogin = new AdminLogin(
      "user",
      "pwd",
      (_) => correctToken,

      async () => {
        /* do not wait in case of unit tests */
      },
      new CustomTimeGateway(),
    );
  });

  it("throws Forbidden if OAuth and password are not corret", async () => {
    await expectPromiseToFailWithError(
      adminLogin.execute({ user: "user", password: "password" }),
      new ForbiddenError("Wrong credentials"),
    );

    await expectPromiseToFailWithError(
      adminLogin.execute({ user: "lala", password: "pwd" }),
      new ForbiddenError("Wrong credentials"),
    );
  });

  it("returns a jwt when OAuth and password match", async () => {
    const token = await adminLogin.execute({ user: "user", password: "pwd" });
    expect(token).toBe(correctToken);
  });
});
