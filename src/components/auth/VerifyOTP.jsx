import { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { verifyOTP, resendOTP } from '../../services/api';
import { useLocation, useNavigate } from 'react-router-dom';

export default function VerifyOTP() {
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;

  const formik = useFormik({
    initialValues: {
      otp: '',
    },
    validationSchema: Yup.object({
      otp: Yup.string()
        .required('OTP is required')
        .matches(/^\d{6}$/, 'OTP must be 6 digits'),
    }),
    onSubmit: async (values) => {
      try {
        setLoading(true);
        await verifyOTP(email, values.otp);
        toast.success('OTP verified successfully!');
        navigate('/setup-password', { state: { email, otp: values.otp } });
      } catch (error) {
        toast.error(error.response?.data?.message || 'OTP verification failed');
      } finally {
        setLoading(false);
      }
    },
  });

  const handleResendOTP = async () => {
    try {
      setResending(true);
      await resendOTP(email);
      toast.success('New OTP sent to your email');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  if (!email) {
    navigate('/register');
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Verify OTP
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter the OTP sent to {email}
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={formik.handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="otp" className="sr-only">
                OTP
              </label>
              <input
                id="otp"
                name="otp"
                type="text"
                required
                className={`appearance-none rounded-md relative block w-full px-3 py-2 border ${
                  formik.touched.otp && formik.errors.otp
                    ? 'border-red-300'
                    : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="Enter 6-digit OTP"
                {...formik.getFieldProps('otp')}
              />
            </div>
          </div>

          {formik.touched.otp && formik.errors.otp && (
            <div className="text-red-500 text-sm">{formik.errors.otp}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={handleResendOTP}
              disabled={resending}
              className="text-sm text-blue-600 hover:text-blue-500 focus:outline-none disabled:opacity-50"
            >
              {resending ? 'Sending...' : 'Resend OTP'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
