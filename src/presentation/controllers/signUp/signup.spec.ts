import { SignUpController } from './signup'
import { MissingParamError, InvalidParamError, ServerError } from '../../errors';
import { EmailValidator, AddAccount, AddAccountModel, AccountModel } from './signup-protocols';
import { resolve } from 'path/posix';
import { rejects } from 'assert';

const makeEmailValidator = (): EmailValidator => {
  class EmailValidatorStub implements EmailValidator {
    isValid(email: string): boolean {
      return true
    }
  }
  return new EmailValidatorStub()
} 
const makeAddAccount = (): AddAccount => {
  class AddAccountStub implements AddAccount {
    async add(account: AddAccountModel): Promise<AccountModel> {
      const fakeAccount = {
        id: 'valid_id',
        name: 'valid_name',
        email: 'valid_email@mail.com',
        password: 'valid_password'
      }
      return new Promise(resolve => resolve(fakeAccount));
    }
  }
  return new AddAccountStub()
}
interface SutType {
  sut: SignUpController,
  emailValidatorStub: EmailValidator
  addAccountStub: AddAccount
}
const makeSut = (): SutType => {

  const emailValidatorStub = makeEmailValidator();
  const addAccountStub = makeAddAccount();
  const sut = new SignUpController(emailValidatorStub, addAccountStub);
  return {
    sut,
    emailValidatorStub, 
    addAccountStub
  }
}

describe('SignUp Controller', () => {
  test('Should return 400 if no name is provided', async() => {
    const { sut } = makeSut();
    const httpRequest = {
      body: {
        email: "any_email@mail.com",
        password: "any_password",
        passwordConfirmation: 'any_password'
      }
    }
    const httpResponse = await sut.handle(httpRequest)
    expect(httpResponse.statusCode).toBe(400)
    expect(httpResponse.body).toEqual(new MissingParamError('name'))
  })
  test('Should return 400 if no email is provided', async() => {
    const { sut } = makeSut();
    const httpRequest = {
      body: {
        name: "Carlos Rafael",
        password: "123456",
        passwordConfirmation: 'any_password'
      }
    }
    const httpResponse = await sut.handle(httpRequest)
    expect(httpResponse.statusCode).toBe(400)
    expect(httpResponse.body).toEqual(new MissingParamError('email'))
  })
  test('Should return 400 if no password is provided', async() => {
    const { sut } = makeSut();
    const httpRequest = {
      body: {
        name: "Carlos Rafael",
        passwordConfirmation: "any_password",
        email: "any_email@mail.com",
      }
    }
    const httpResponse = await sut.handle(httpRequest)
    expect(httpResponse.statusCode).toBe(400)
    expect(httpResponse.body).toEqual(new MissingParamError('password'))
  })
  test('Should return 400 if no passwordConfirmation is provided', async() => {
    const { sut } = makeSut();
    const httpRequest = {
      body: {
        name: "Carlos Rafael",
        password: "any_password",
        email: "any_email@mail.com",
      }
    }
    const httpResponse = await sut.handle(httpRequest)
    expect(httpResponse.statusCode).toBe(400)
    expect(httpResponse.body).toEqual(new MissingParamError('passwordConfirmation'))
  })
  test('Should return 400 if no password confirmation fails', async() => {
    const { sut } = makeSut();
    const httpRequest = {
      body: {
        name: "Carlos Rafael",
        password: "any_password",
        passwordConfirmation: "invalidPass",
        email: "any_email@mail.com",
      }
    }
    const httpResponse = await sut.handle(httpRequest)
    expect(httpResponse.statusCode).toBe(400)
    expect(httpResponse.body).toEqual(new InvalidParamError('passwordConfirmation'))
  })
  test('Should return 400 if an invalid email is provided', async() => {
    const { sut, emailValidatorStub } = makeSut();
    jest.spyOn(emailValidatorStub, 'isValid').mockReturnValueOnce(false);
    const httpRequest = {
      body: {
        name: "Carlos Rafael",
        password: "any_password",
        email: "invalid_email@mail.com",
        passwordConfirmation: 'any_password'
      }
    }
    const httpResponse = await sut.handle(httpRequest)
    expect(httpResponse.statusCode).toBe(400)
    expect(httpResponse.body).toEqual(new InvalidParamError('email'))
  })
  test('Should call EmailValidator with correct email', async() => {
    const { sut, emailValidatorStub } = makeSut();
    const isValidSpy = jest.spyOn(emailValidatorStub, 'isValid');
    const httpRequest = {
      body: {
        name: "Carlos Rafael",
        password: "any_password",
        email: "invalid_email@mail.com",
        passwordConfirmation: 'any_password'
      }
    }
    const httpResponse = await sut.handle(httpRequest);
    expect(isValidSpy).toHaveBeenCalledWith('invalid_email@mail.com');
  })
  test('Should return 500 if EmailValidator Throws', async() => {

    const {sut, emailValidatorStub}  = makeSut();
    jest.spyOn(emailValidatorStub, 'isValid').mockImplementationOnce(() => {
      throw new Error()
    })

    const httpRequest = {
      body: {
        name: "Carlos Rafael",
        email: "anyMail@email.com",
        password: "123456",
        passwordConfirmation: '123456'
      }
    }
    const httpResponse = await sut.handle(httpRequest)
    expect(httpResponse.statusCode).toBe(500)
    expect(httpResponse.body).toEqual(new ServerError())
  })
  test('Should return 500 if AddAccount Throws', async() => {

    const {sut, addAccountStub}  = makeSut();
    jest.spyOn(addAccountStub, 'add').mockImplementationOnce(() => {
      return new Promise((resolve, reject) => reject(new Error()))
    })

    const httpRequest = {
      body: {
        name: "Carlos Rafael",
        email: "anyMail@email.com",
        password: "123456",
        passwordConfirmation: '123456'
      }
    }
    const httpResponse = await sut.handle(httpRequest)
    expect(httpResponse.statusCode).toBe(500)
    expect(httpResponse.body).toEqual(new ServerError())
  })
  test('Should call AddAccount with correct values', () => {

    const { sut , addAccountStub }  = makeSut();
    const addSpy = jest.spyOn(addAccountStub, 'add')

    const httpRequest = {
      body: {
        name: "Carlos Rafael",
        email: "anyMail@email.com",
        password: "123456",
        passwordConfirmation: '123456'
      }
    }
    sut.handle(httpRequest)
    expect(addSpy).toHaveBeenCalledWith({
      name: "Carlos Rafael",
      email: "anyMail@email.com",
      password: "123456",
    })
  })
  test('Should return 200 if valid data is provided', async() => {
    const { sut } = makeSut();
    const httpRequest = {
      body: {
        name: 'valid_name',
        email: 'valid_email@mail.com',
        password: 'valid_password',
        passwordConfirmation: 'valid_password'
      }
    }
    const httpResponse = await sut.handle(httpRequest)
    expect(httpResponse.statusCode).toBe(200)
    expect(httpResponse.body).toEqual({
      id: 'valid_id',
      name: 'valid_name',
      email: 'valid_email@mail.com',
      password: 'valid_password'
    })
  })
})
