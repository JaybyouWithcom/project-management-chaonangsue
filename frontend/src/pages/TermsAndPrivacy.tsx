import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface VerifyState {
  pendingSignupId?: number;
  email?: string;
  phoneNumber?: string | null;
}

const VERIFY_STATE_STORAGE_KEY = "verify-account-state";
const TERMS_ACCEPTED_STORAGE_KEY = "verify-account-terms-accepted";

const readStoredVerifyState = (): VerifyState => {
  try {
    const raw = sessionStorage.getItem(VERIFY_STATE_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as VerifyState;
    if (!parsed || typeof parsed.pendingSignupId !== "number") {
      return {};
    }
    return parsed;
  } catch {
    return {};
  }
};

const TermsAndPrivacyPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const location = useLocation();
  const routeState = (location.state as VerifyState | null) ?? {};
  const storedState = readStoredVerifyState();
  const state = routeState.pendingSignupId ? routeState : storedState;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const [hasAccepted, setHasAccepted] = useState(false);

  const canProceed = useMemo(() => hasScrolledToEnd && hasAccepted, [hasAccepted, hasScrolledToEnd]);

  useEffect(() => {
    if (!state.pendingSignupId) {
      toast({
        title: "ไม่พบข้อมูลผู้ใช้",
        description: "กรุณาสมัครใหม่อีกครั้ง",
        variant: "destructive",
      });
      navigate("/auth");
    }
  }, [navigate, state.pendingSignupId, toast]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const checkReachedEnd = () => {
      const reached = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
      if (reached) {
        setHasScrolledToEnd(true);
      }
    };
    checkReachedEnd();
    el.addEventListener("scroll", checkReachedEnd);
    return () => {
      el.removeEventListener("scroll", checkReachedEnd);
    };
  }, []);

  const handleContinue = () => {
    sessionStorage.setItem(TERMS_ACCEPTED_STORAGE_KEY, "true");
    navigate("/auth/verify", { state });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="container mx-auto px-4 py-10 flex-1 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>ข้อกำหนดและนโยบายความเป็นส่วนตัว</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg border bg-muted/30">
              <div
                ref={scrollRef}
                className="max-h-[360px] overflow-y-auto p-4 space-y-6 text-sm leading-relaxed"
              >
                <section className="space-y-3">
                  <h3 className="text-base font-semibold">1. ข้อกำหนดและเงื่อนไขการใช้บริการ (Terms of Service)</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium">ข้อ 1. การลงทะเบียนและการยืนยันตัวตน</p>
                      <p>
                        ผู้ใช้บริการตกลงให้ข้อมูลที่ถูกต้องและเป็นปัจจุบัน โดยระบบจะมีการตรวจสอบตัวตนผ่านระบบ OTP
                        เพื่อความปลอดภัยและใช้เป็นหลักฐานในการทำสัญญาตามกฎหมาย
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">ข้อ 2. หน้าที่และการคืนทรัพย์สิน</p>
                      <p>
                        ผู้เช่ามีหน้าที่ต้องดูแลรักษาหนังสือและส่งคืนภายในกำหนดเวลาที่ระบุไว้ในคำสั่งเช่า หากเกินกำหนด
                        ผู้เช่าตกลงชำระค่าปรับรายวันตามอัตราที่แพลตฟอร์มกำหนด
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="font-medium">ข้อ 3. การผิดนัดขั้นรุนแรงและการเปิดเผยข้อมูล</p>
                      <p>
                        หากผู้เช่าไม่ส่งคืนหนังสือเกินกว่า 7 วัน นับจากวันครบกำหนด แพลตฟอร์มจะถือว่าผู้เช่ามีเจตนาทุจริตเบียดบังทรัพย์สิน
                        (เข้าข่ายความผิดฐานยักยอกทรัพย์ตามประมวลกฎหมายอาญา มาตรา 352)
                      </p>
                      <ul className="list-disc pl-5 space-y-2">
                        <li>
                          การเปิดเผยข้อมูล: ในกรณีนี้ ผู้เช่าตกลงยินยอมให้ผู้ดูแลระบบ (Admin) เปิดเผยข้อมูลส่วนบุคคล
                          (ชื่อ, ที่อยู่, เบอร์โทรศัพท์, อีเมล และหลักฐานการเช่า) ให้แก่ผู้ให้เช่าหรือทนายความ
                          เพื่อใช้ในการดำเนินคดีแพ่งและอาญาจนถึงที่สุด
                        </li>
                        <li>
                          การสื่อสารทางอิเล็กทรอนิกส์: การแจ้งเตือนผ่านระบบแดชบอร์ดของเว็บไซต์ ถือเป็นหนังสือบอกกล่าวทวงถาม (Notice)
                          ที่มีผลผูกพันตามกฎหมายธุรกรรมทางอิเล็กทรอนิกส์
                        </li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium">ข้อ 4. ข้อห้ามการประจานสาธารณะ</p>
                      <p>
                        ผู้ให้เช่าที่ได้รับข้อมูลไปเพื่อดำเนินคดี ห้ามมิให้ นำข้อมูลดังกล่าวไปโพสต์ประจานในสื่อสังคมออนไลน์หรือที่สาธารณะ
                        หากมีการฝ่าฝืนจนทำให้ผู้เช่าเสียหาย ผู้ให้เช่าต้องรับผิดชอบในความผิดฐานหมิ่นประมาทโดยการโฆษณาด้วยตนเองแต่เพียงผู้เดียว
                      </p>
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-base font-semibold">2. นโยบายความเป็นส่วนตัว (Privacy Policy)</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium">1. ข้อมูลที่เราจัดเก็บ</p>
                      <p>เราเก็บรวบรวมข้อมูลส่วนบุคคลที่จำเป็น ได้แก่ ชื่อ-นามสกุล, ที่อยู่ตามทะเบียนบ้าน/จัดส่ง, หมายเลขโทรศัพท์, และอีเมล</p>
                    </div>
                    <div className="space-y-2">
                      <p className="font-medium">2. ฐานทางกฎหมายในการประมวลผลข้อมูล (Lawful Basis)</p>
                      <p>เราประมวลผลข้อมูลของคุณภายใต้ฐานทางกฎหมายดังนี้:</p>
                      <ul className="list-disc pl-5 space-y-2">
                        <li>ฐานสัญญา (Contract): เพื่อปฏิบัติตามสัญญาเช่าหนังสือระหว่างท่านและคู่สัญญา</li>
                        <li>ฐานประโยชน์อันชอบธรรม (Legitimate Interest): เพื่อการป้องกันการทุจริต และการติดตามทวงถามทรัพย์สินคืนในกรณีมีการผิดนัดสัญญา</li>
                        <li>ฐานสิทธิเรียกร้องตามกฎหมาย (Legal Claims): เพื่อการก่อตั้ง ใช้ หรือยกขึ้นต่อสู้ซึ่งสิทธิเรียกร้องตามกฎหมายทั้งในชั้นพนักงานสอบสวนและชั้นศาล</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <p className="font-medium">3. การเปิดเผยข้อมูลแก่บุคคลที่สาม</p>
                      <p>เราอาจเปิดเผยข้อมูลส่วนบุคคลของท่านให้แก่:</p>
                      <ul className="list-disc pl-5 space-y-2">
                        <li>ผู้ให้เช่า (Lender): เฉพาะกรณีที่ท่านผิดนัดคืนหนังสือเกินระยะเวลาสูงสุดที่กำหนด เพื่อให้ผู้ให้เช่าใช้สิทธิเรียกร้องตามกฎหมาย</li>
                        <li>พนักงานสอบสวน/หน่วยงานราชการ: เพื่อปฏิบัติตามคำสั่งเรียกตรวจสอบข้อมูลในคดีอาญา (เช่น ยักยอกทรัพย์ หรือฉ้อโกง)</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium">4. ระยะเวลาการเก็บรักษาข้อมูล</p>
                      <p>
                        เราจะเก็บข้อมูลไว้จนกว่าสัญญาเช่าจะสิ้นสุดลง หรือในกรณีที่มีข้อพิพาท เราจะเก็บข้อมูลไว้จนกว่าคดีความจะถึงที่สุด
                        หรือจนกว่าจะหมดอายุความตามกฎหมาย (สูงสุด 10 ปี)
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">5. สิทธิของเจ้าของข้อมูล</p>
                      <p>
                        ท่านมีสิทธิขอเข้าถึง ขอแก้ไข ขอคัดค้าน หรือขอให้ลบข้อมูลส่วนบุคคลของท่าน อย่างไรก็ตาม เราอาจปฏิเสธคำขอได้หากข้อมูลนั้นยังจำเป็นต้องใช้เพื่อการดำเนินคดีหรือการใช้สิทธิเรียกร้องตามกฎหมาย
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="terms"
                  checked={hasAccepted}
                  disabled={!hasScrolledToEnd}
                  onCheckedChange={(value) => setHasAccepted(Boolean(value))}
                />
                <Label htmlFor="terms" className="text-sm leading-relaxed">
                  ฉันได้อ่านและยอมรับข้อกำหนดและนโยบายความเป็นส่วนตัวแล้ว
                </Label>
              </div>
            </div>

            <Button className="w-full" type="button" onClick={handleContinue} disabled={!canProceed}>
              ไปต่อเพื่อยืนยัน OTP
            </Button>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default TermsAndPrivacyPage;
