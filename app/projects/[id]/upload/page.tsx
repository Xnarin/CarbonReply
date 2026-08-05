type UploadPageProps = {
  params: Promise<{ id: string }>;
};

export default async function UploadPage({ params }: UploadPageProps) {
  const { id } = await params;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f5f2] px-5 text-[#1d2a24]">
      <section className="w-full max-w-xl rounded-2xl border border-[#c9d6cb] bg-white p-8 text-center shadow-[0_16px_40px_rgba(35,65,46,0.08)]">
        <p className="text-sm font-semibold tracking-[0.16em] text-[#4d7a62]">STEP 2 OF 3</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">고지서 업로드</h1>
        <p className="mt-4 leading-7 text-[#66756b]">
          프로젝트가 생성되었습니다. 다음 기능에서 이 화면에 PDF 업로드와 Gemini 추출을 연결합니다.
        </p>
        <p className="mt-6 break-all rounded-lg bg-[#edf4ee] px-4 py-3 text-xs text-[#4d7a62]">
          프로젝트 ID: {id}
        </p>
      </section>
    </main>
  );
}
