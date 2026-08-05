export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f6f4] px-6 text-[#1d2a24]">
      <section className="max-w-xl text-center">
        <p className="mb-4 text-sm font-medium tracking-[0.16em] text-[#4d7a62]">
          CARBONREPLY
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          탄소길잡이
        </h1>
        <p className="mt-5 text-lg leading-8 text-[#5f6d65]">
          협력사의 전기요금 고지서에서 탄소 데이터를 읽고,
          <br />
          빠진 자료 확인부터 배출량 응답까지 안내합니다.
        </p>
        <p className="mt-10 rounded-lg border border-[#cbd7cf] bg-white px-5 py-4 text-sm text-[#5f6d65]">
          서비스 연결 준비 중입니다. Supabase 환경 변수를 설정하면 데이터 연결을 확인할 수 있습니다.
        </p>
      </section>
    </main>
  );
}
