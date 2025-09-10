import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <h1 className="text-4xl font-bold mb-8">Tree Chat</h1>
      </div>

      <div className="mb-32 grid text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-2 lg:text-left">
        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100">
          <h2 className="mb-3 text-2xl font-semibold">
            Structured Thinking Platform
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            AI-powered tools for structured thinking with frameworks like Lean Canvas, SWOT Analysis, and more.
          </p>
        </div>

        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100">
          <div className="space-y-4">
            <Link 
              href="/sign-in" 
              className="inline-block bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Sign In
            </Link>
            <Link 
              href="/sign-up" 
              className="inline-block bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded ml-4"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}