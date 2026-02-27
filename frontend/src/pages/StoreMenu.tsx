import { FormEvent, useState } from "react";
import { Plus, Store } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPost, HttpError, resolveImageUrl } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface ApiShop {
  shopId: number;
  shopName: string;
  description: string | null;
  imagePath: string;
}

const StoreMenu = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const token = getAuthToken();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: shops = [], isLoading, isError } = useQuery({
    queryKey: ["my-shops"],
    queryFn: async () => {
      if (!token) {
        return [] as ApiShop[];
      }
      const result = await apiGet<{ shops: ApiShop[] }>("/api/shops", token);
      return result.data.shops;
    },
  });

  const handleCreateStore = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      toast({
        title: "กรุณาเข้าสู่ระบบก่อน",
        description: "ต้อง login เพื่อสร้างร้าน",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }
    if (!name.trim() || !description.trim() || !imageFile) {
      return;
    }

    setSubmitting(true);
    try {
      const imageBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            resolve(reader.result);
            return;
          }
          reject(new Error("อ่านไฟล์ไม่สำเร็จ"));
        };
        reader.onerror = () => reject(new Error("อ่านไฟล์ไม่สำเร็จ"));
        reader.readAsDataURL(imageFile);
      });

      await apiPost(
        "/api/shops",
        {
          shopName: name.trim(),
          description: description.trim(),
          imageBase64,
        },
        token,
      );

      await queryClient.invalidateQueries({ queryKey: ["my-shops"] });
      setName("");
      setDescription("");
      setImageFile(null);
      setOpen(false);
      toast({ title: "สร้างร้านสำเร็จ" });
    } catch (error) {
      toast({
        title: "สร้างร้านไม่สำเร็จ",
        description: error instanceof HttpError ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
        <div className="container mx-auto px-4 py-8 flex-1">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-6">ร้านของฉัน</h1>

          {!token && (
            <p className="mb-4 text-sm text-destructive">
              กรุณาเข้าสู่ระบบก่อนสร้างร้านหรือจัดการร้าน
            </p>
          )}
          {isError && (
            <p className="mb-4 text-sm text-destructive">
              โหลดรายการร้านไม่สำเร็จ
            </p>
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Card className="h-64 cursor-pointer border-2 border-dashed hover:border-primary transition-colors">
                  <CardContent className="flex h-full items-center gap-6 p-8">
                    <div className="rounded-full bg-primary/10 p-5">
                      <Plus className="h-12 w-12 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold">สร้างบัญชีร้านใหม่</p>
                      <p className="text-muted-foreground mt-2">เพิ่มชื่อร้าน รายละเอียด และอัปโหลดรูปร้าน</p>
                    </div>
                  </CardContent>
                </Card>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>สร้างบัญชีร้าน</DialogTitle>
                </DialogHeader>
                <form className="space-y-4" onSubmit={(event) => { void handleCreateStore(event); }}>
                  <div>
                    <Label htmlFor="shop-name">ชื่อร้าน</Label>
                    <Input id="shop-name" value={name} onChange={(event) => setName(event.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="shop-desc">รายละเอียดร้าน</Label>
                    <Textarea id="shop-desc" value={description} onChange={(event) => setDescription(event.target.value)} required rows={4} />
                  </div>
                  <div>
                    <Label htmlFor="shop-image">แบนเนอร์ร้าน</Label>
                    <Input
                      id="shop-image"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(event) => {
                        setImageFile(event.target.files?.[0] ?? null);
                      }}
                      required
                    />
                  </div>
                  <Button className="w-full" type="submit" disabled={submitting}>
                    {submitting ? "กำลังสร้างร้าน..." : "สร้างร้าน"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            {!isLoading && shops.map((shop) => (
              <Card
                key={shop.shopId}
                className="h-64 cursor-pointer overflow-hidden hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/store/dashboard?shopId=${shop.shopId}`)}
                role="button"
              >
                <img
                  src={shop.imagePath ? resolveImageUrl(shop.imagePath) : "https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=1200&q=80"}
                  alt={shop.shopName}
                  className="h-40 w-full object-cover"
                />
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 font-semibold text-lg">
                    <Store className="h-5 w-5 text-primary" />
                    {shop.shopName}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {shop.description ?? "-"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      <Footer />
    </div>
  );
};

export default StoreMenu;
