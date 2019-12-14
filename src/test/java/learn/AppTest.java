package learn;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

public class AppTest
{
    @Test
    public void shouldAddTwoPositiveNumbers()
    {
        assertEquals(2, new App().addition(Integer.valueOf(1), Integer.valueOf(1)).longValue());
    }

//    @Test
//    public void shouldSubtractOnePositiveNumberFromAnother_ReturnPositiveNumber()
//    {
//        assertEquals(1, new App().subtraction(Integer.valueOf(2), Integer.valueOf(1)).longValue());
//    }

//    @Test
//    public void shouldMultiplyTwoPositiveNumbers()
//    {
//        assertEquals(4, new App().multiplication(Integer.valueOf(2), Integer.valueOf(2)).longValue());
//    }
}
