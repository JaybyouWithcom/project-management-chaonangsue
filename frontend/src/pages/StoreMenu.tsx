import { FormEvent, useEffect, useState } from "react";
import { Plus, Store } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface StoreAccount {
  id: string;
  name: string;
  description: string;
  imageDataUrl: string;
}

const STORAGE_KEY = "shop-menu-store-accounts";

const StoreMenu = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [stores, setStores] = useState<StoreAccount[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");

  useEffect(() => {
    const savedStores = localStorage.getItem(STORAGE_KEY);
    if (!savedStores) return;

    try {
      setStores(JSON.parse(savedStores) as StoreAccount[]);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const saveStores = (nextStores: StoreAccount[]) => {
    setStores(nextStores);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStores));
  };

  const handleUploadImage = async (file: File | null) => {
    if (!file) {
      setImageDataUrl("");
      return;
    }

    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
          return;
        }

        reject(new Error("อ่านไฟล์ไม่สำเร็จ"));
      };
      reader.onerror = () => reject(new Error("อ่านไฟล์ไม่สำเร็จ"));
      reader.readAsDataURL(file);
    });

    setImageDataUrl(base64);
  };

  const handleCreateStore = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !description.trim() || !imageDataUrl) {
      return;
    }

    const nextStores = [
      ...stores,
      {
        id: crypto.randomUUID(),
        name: name.trim(),
        description: description.trim(),
        imageDataUrl,
      },
    ];

    saveStores(nextStores);
    setName("");
    setDescription("");
    setImageDataUrl("");
    setOpen(false);
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-3xl font-bold">เมนูร้านของฉัน</h1>

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
              <form className="space-y-4" onSubmit={handleCreateStore}>
                <div>
                  <Label htmlFor="shop-name">ชื่อร้าน</Label>
                  <Input id="shop-name" value={name} onChange={(event) => setName(event.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="shop-desc">รายละเอียดร้าน</Label>
                  <Textarea id="shop-desc" value={description} onChange={(event) => setDescription(event.target.value)} required rows={4} />
                </div>
                <div>
                  <Label htmlFor="shop-image">รูปร้าน</Label>
                  <Input
                    id="shop-image"
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      void handleUploadImage(event.target.files?.[0] ?? null);
                    }}
                    required
                  />
                </div>
                <Button className="w-full" type="submit">สร้างร้าน</Button>
              </form>
            </DialogContent>
          </Dialog>

          {stores.map((store) => (
            <Card
              key={store.id}
              className="h-64 cursor-pointer overflow-hidden hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/admin/dashboard?storeId=${store.id}`)}
              role="button"
            >
              <img src={store.imageDataUrl} alt={store.name} className="h-40 w-full object-cover" />
              <CardContent className="p-4">
                <div className="flex items-center gap-2 font-semibold text-lg">
                  <Store className="h-5 w-5 text-primary" />
                  {store.name}
                </div>
                <p className="text-sm text-muted-foreground">{store.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StoreMenu;
