// "ZaloCall dang goi" gia: 1 cua so that, nam ngoai man hinh, KHONG gianh focus (ShowWithoutActivation).
using System;
using System.Drawing;
using System.Windows.Forms;

public class CallGia : Form
{
    protected override bool ShowWithoutActivation { get { return true; } }

    public CallGia()
    {
        StartPosition = FormStartPosition.Manual;
        Location = new Point(-4000, -4000);
        Size = new Size(160, 60);
        Text = "ZaloCall gia (thu zalo-gon)";
    }

    [STAThread]
    public static void Main() { Application.Run(new CallGia()); }
}
